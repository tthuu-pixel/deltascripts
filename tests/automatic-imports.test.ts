import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime';
import { parseTexText } from '../shared/texParser';
import {
  automaticImportsRoute,
  automaticImportJobs,
  claimAutomaticImports,
  processAutomaticImports,
  publishAutomaticImport,
  wakeAutomaticImports,
} from '../server/automatic-imports';
import { adminAiRoute } from '../server/admin-ai';
import { normalizeEssayQuestion } from '../shared/essayNormalization';
import { sendAutomaticUpload, type AutomaticUploadDraft } from '../src/services/automaticUpload';
const secret = 'automatic-import-test-fixture-key-32-characters';
async function upload(db: any, questions: any[], id = crypto.randomUUID()) {
  await automaticImportsRoute(db, '/api/admin/imports/start', 'POST', {
    id,
    files: ['source.tex'],
    expected: questions.length,
  });
  await automaticImportsRoute(db, '/api/admin/imports/items', 'POST', { id, items: questions });
  await automaticImportsRoute(db, '/api/admin/imports/finish', 'POST', { id });
  return id;
}

test('automatic imports only classify and publish unchanged sources without approval; repeated receipts and uploads do not duplicate sources', async (t) => {
  const topic = crypto.randomUUID();
  let calls = 0;
  const fetchMock: typeof fetch = async (_url, init) => {
    calls++;
    const data = JSON.parse(JSON.parse(String(init?.body)).messages.at(-1).content);
    assert(!String(init?.body).includes('\\\\draw'));
    assert(data.questions.every((q: any) => !('solution' in q)));
    assert.equal(data.topics.length, 1); // Unpublished topics cannot receive automatic publication.
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: data.questions.map((q: any) => ({
                id: q.id,
                statementRaw: q.statement,
                solutionRaw: q.solution,
                topicIds: [topic],
                reason: 'Đã nhận dạng chuyên đề.',
              })),
            }),
          },
        },
      ],
    });
  };
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  await db
    .prepare(
      "INSERT INTO topics(id,title,description,published) VALUES(?,'Tính toán','Tính giá trị biểu thức.',1),(?,'Nháp','Riêng tư',0)",
    )
    .bind(topic, crypto.randomUUID())
    .run();
  await adminAiRoute(
    db,
    '/api/admin/ai/settings',
    'POST',
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiKey: 'fixture',
      version: 0,
    },
    { aiSettingsKey: secret },
  );
  const source = String.raw`\begin{ex}Tính $2+2$.\immini{Hình vẽ.}{\begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}}\loigiai{$4$.}\end{ex}`;
  const essay = parseTexText(source)[0];
  const multiple = parseTexText(String.raw`\begin{ex}Chọn số.\choice{1}{2}{3}{4}\end{ex}`)[0];
  const id = await upload(db, [essay, multiple]);
  await automaticImportsRoute(db, '/api/admin/imports/items', 'POST', {
    id,
    items: [essay, multiple],
  });
  assert.equal((await automaticImportJobs(db))[0].received, 2);
  assert.equal((await db.query('SELECT id FROM questions')).rows.length, 0);
  await processAutomaticImports(db, { aiSettingsKey: secret, fetchGemini: fetchMock });
  const job = (await automaticImportJobs(db))[0];
  assert.equal(job.published, 1);
  assert.equal(job.skipped, 1);
  assert.equal(job.waiting, 0);
  const saved = (await db.query('SELECT * FROM questions')).rows[0];
  assert.equal(saved.published, 1);
  assert.equal(saved.raw, source);
  assert.equal(saved.statement_raw, essay.statementRaw);
  assert.equal(saved.solution_raw, essay.solutionRaw);
  assert(
    String(saved.raw).includes(String.raw`\begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}`),
  );
  assert.equal((await db.query('SELECT topic_id FROM question_topics')).rows[0].topic_id, topic);
  const baseline = (await db.query('SELECT snapshot FROM question_revisions')).rows[0];
  assert.equal(JSON.parse(String(baseline.snapshot)).raw, source);
  await upload(db, [{ ...essay, id: crypto.randomUUID() }]);
  await processAutomaticImports(db, { aiSettingsKey: secret, fetchGemini: fetchMock });
  assert.equal(calls, 1);
  assert.equal((await db.query('SELECT id FROM questions')).rows.length, 1);
});

test('expired work can be reclaimed; stale leases and failed atomic publication never leak partial questions', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  const questions = Array.from(
    { length: 8 },
    (_, i) => parseTexText(`\\begin{bt}Tính $${i + 1}+1$.\\end{bt}`)[0],
  );
  await upload(db, questions);
  const now = Date.now();
  const a = await claimAutomaticImports(db, now, 6);
  assert.equal(a.length, 6);
  assert.equal((await claimAutomaticImports(db, now, 6)).length, 0);
  const b = await claimAutomaticImports(db, now + 120001, 6);
  assert.equal(b.length, 6);
  const original = questions.find((q) => q.id === a[0].question_id)!;
  assert.equal(
    await publishAutomaticImport(db, a[0], { ...normalizeEssayQuestion(original), topicIds: [] }),
    false,
  );
  assert.equal((await db.query('SELECT id FROM questions')).rows.length, 0);
  const lease = b.find((q) => q.question_id === a[0].question_id)!;
  const q = normalizeEssayQuestion(JSON.parse(lease.payload));
  await assert.rejects(() =>
    publishAutomaticImport(db, lease, { ...q, topicIds: [crypto.randomUUID()] }),
  );
  assert.equal((await db.query('SELECT id FROM questions')).rows.length, 0);
  assert.equal((await db.query('SELECT id FROM question_revisions')).rows.length, 0);
});

test('AI service errors preserve the uploaded batch and automatically retry after configuration is corrected', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  const topic = crypto.randomUUID();
  await db
    .prepare("INSERT INTO topics(id,title,description,published) VALUES(?,'Đại số','Biểu thức',1)")
    .bind(topic)
    .run();
  await adminAiRoute(
    db,
    '/api/admin/ai/settings',
    'POST',
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiKey: 'fixture',
      version: 0,
    },
    { aiSettingsKey: secret },
  );
  await upload(db, parseTexText(String.raw`\begin{bt}Tính $2+2$.\end{bt}`));
  await processAutomaticImports(db, {
    aiSettingsKey: secret,
    fetchGemini: async () => new Response('private vendor body', { status: 401 }),
  });
  let job = (await automaticImportJobs(db))[0];
  assert.equal(job.waiting, 1);
  assert.equal(job.published, 0);
  assert(job.nextAttempt! > Date.now());
  assert(!job.reason.includes('private vendor body'));
  await wakeAutomaticImports(db);
  await processAutomaticImports(db, {
    aiSettingsKey: secret,
    fetchGemini: async (_url, init) => {
      const data = JSON.parse(JSON.parse(String(init?.body)).messages.at(-1).content);
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: data.questions.map((q: any) => ({
                  id: q.id,
                  statementRaw: q.statement,
                  solutionRaw: q.solution,
                  topicIds: [topic],
                  reason: 'Đã nhận dạng chuyên đề.',
                })),
              }),
            },
          },
        ],
      });
    },
  });
  job = (await automaticImportJobs(db))[0];
  assert.equal(job.published, 1);
  assert.equal(job.waiting, 0);
});

test('client retries lost acknowledgements using stable receipts, persists offsets and finishes without approval', async () => {
  const questions = Array.from(
    { length: 30 },
    (_, i) => parseTexText(`\\begin{bt}Bài ${i}.\\end{bt}`)[0],
  );
  const draft: AutomaticUploadDraft = {
    id: crypto.randomUUID(),
    files: ['batch.tex'],
    questions,
    offset: 0,
    createdAt: Date.now(),
  };
  let persisted: AutomaticUploadDraft | undefined;
  const seen = new Set<string>();
  let failed = false,
    finished = false,
    waits = 0;
  const store = {
    all: async () => (persisted ? [persisted] : []),
    put: async (d: AutomaticUploadDraft) => {
      persisted = structuredClone(d);
    },
    remove: async () => {
      persisted = undefined;
    },
  };
  const api = {
    startAutomaticImport: async () => {
      assert(persisted);
      return { id: draft.id };
    },
    appendAutomaticImport: async (_id: string, items: any[]) => {
      items.forEach((q) => seen.add(q.id));
      if (!failed) {
        failed = true;
        throw new Error('Lost acknowledgement');
      }
      return { accepted: items.length };
    },
    finishAutomaticImport: async () => {
      assert.equal(seen.size, 30);
      finished = true;
      return { id: draft.id };
    },
  };
  await sendAutomaticUpload(draft, {
    signal: new AbortController().signal,
    onProgress: () => {},
    api,
    store,
    wait: async () => {
      waits++;
    },
  });
  assert.equal(waits, 1);
  assert.equal(finished, true);
  assert.equal(persisted, undefined);
  assert.equal(seen.size, 30);
});

test('upload resumes from the last confirmed part with the same job and question IDs', async () => {
  const questions = Array.from(
    { length: 20 },
    (_, i) => parseTexText(`\\begin{bt}Tính $${i}+1$.\\end{bt}`)[0],
  );
  let persisted: AutomaticUploadDraft | undefined;
  const draft: AutomaticUploadDraft = {
    id: crypto.randomUUID(),
    files: ['resume.tex'],
    questions,
    offset: 0,
    createdAt: Date.now(),
  };
  const controller = new AbortController();
  const received: string[] = [];
  let finished = false;
  const store = {
    put: async (q: AutomaticUploadDraft) => {
      persisted = structuredClone(q);
    },
    remove: async () => {
      persisted = undefined;
    },
  };
  const api = {
    startAutomaticImport: async (id: string) => {
      assert.equal(id, draft.id);
    },
    appendAutomaticImport: async (_id: string, items: any[]) => {
      received.push(...items.map((q) => q.id));
    },
    finishAutomaticImport: async () => {
      finished = true;
    },
  };
  await assert.rejects(
    () =>
      sendAutomaticUpload(draft, {
        signal: controller.signal,
        api,
        store,
        onProgress: (n) => {
          if (n === 15) controller.abort();
        },
      }),
    { name: 'AbortError' },
  );
  assert.equal(persisted!.offset, 15);
  assert(!finished);
  await sendAutomaticUpload(persisted!, {
    signal: new AbortController().signal,
    api,
    store,
    onProgress: () => {},
  });
  assert(finished);
  assert.deepEqual(
    received,
    questions.map((q) => q.id),
  );
  assert.equal(persisted, undefined);
});

test('large TeX sources use small transport packets suitable for slow upload connections', async () => {
  const questions = Array.from({ length: 17 }, (_, i) => ({
    ...parseTexText(`\\begin{bt}Bài ${i + 1}.\\end{bt}`)[0],
    statementRaw: 'x'.repeat(14000),
    raw: 'y'.repeat(15000),
  }));
  const received = new Set<string>();
  await sendAutomaticUpload(
    {
      id: crypto.randomUUID(),
      files: ['large-drawings.tex'],
      questions,
      offset: 0,
      createdAt: Date.now(),
    },
    {
      signal: new AbortController().signal,
      onProgress: () => {},
      store: { put: async () => {}, remove: async () => {} },
      api: {
        startAutomaticImport: async () => ({}),
        appendAutomaticImport: async (_id, batch) => {
          assert(batch.length <= 5);
          assert(new TextEncoder().encode(JSON.stringify(batch)).length <= 65000);
          batch.forEach((q) => received.add(q.id));
          return {};
        },
        finishAutomaticImport: async () => ({}),
      },
    },
  );
  assert.equal(received.size, 17);
});

test('automatic import endpoints are private to administrators', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  for (const route of ['', '/start', '/items', '/finish']) {
    const response = await fetch(
      runtime.url.origin + '/api/admin/imports' + route,
      route
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
        : undefined,
    );
    assert.equal(response.status, 401);
  }
  await runtime.db.query("INSERT INTO access_codes(code) VALUES('AUTOTEST')");
  const login = await fetch(runtime.url.origin + '/api/auth/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentName: 'Học sinh', studentClass: '9A', accessCode: 'AUTOTEST' }),
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0] || '';
  assert.equal(login.status, 200);
  const response = await fetch(runtime.url.origin + '/api/admin/imports', {
    headers: { Cookie: cookie },
  });
  assert.equal(response.status, 403);
});

test('each default background run and upload part stays within the D1 Free query budget', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const topic = crypto.randomUUID();
  await runtime.db
    .prepare(
      "INSERT INTO topics(id,title,description,published) VALUES(?,'Đại số','Tính giá trị',1)",
    )
    .bind(topic)
    .run();
  await adminAiRoute(
    runtime.db,
    '/api/admin/ai/settings',
    'POST',
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiKey: 'fixture',
      version: 0,
    },
    { aiSettingsKey: secret },
  );
  let queries = 0;
  const db = {
    ...runtime.db,
    prepare: (sql: string) => {
      queries++;
      return runtime.db.prepare(sql);
    },
  };
  const questions = Array.from(
    { length: 15 },
    (_, i) => parseTexText(`\\begin{bt}Tính $${i}+1$.\\end{bt}`)[0],
  );
  const id = crypto.randomUUID();
  await automaticImportsRoute(db, '/api/admin/imports/start', 'POST', {
    id,
    files: ['budget.tex'],
    expected: 15,
  });
  queries = 0;
  await automaticImportsRoute(db, '/api/admin/imports/items', 'POST', { id, items: questions });
  assert(
    queries <= 48,
    `Upload used ${queries} queries, leaving room for authentication/rate limit.`,
  );
  await automaticImportsRoute(db, '/api/admin/imports/finish', 'POST', { id });
  queries = 0;
  await processAutomaticImports(db, {
    aiSettingsKey: secret,
    fetchGemini: async (_url, init) => {
      const data = JSON.parse(JSON.parse(String(init?.body)).messages.at(-1).content);
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: data.questions.map((q: any) => ({
                  id: q.id,
                  statementRaw: q.statement,
                  solutionRaw: q.solution,
                  topicIds: [topic],
                  reason: 'Đã nhận dạng chuyên đề.',
                })),
              }),
            },
          },
        ],
      });
    },
  });
  assert(queries <= 45, `Background run used ${queries} queries.`);
  assert.equal((await automaticImportJobs(runtime.db))[0].published, 6);
});

test('legacy repair flags only save topic links, ignoring model-provided code and preserving malformed source', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db,
    topic = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO topics(id,title,description,published) VALUES(?,'Đại số','Tính biểu thức',1)",
    )
    .bind(topic)
    .run();
  await adminAiRoute(
    db,
    '/api/admin/ai/settings',
    'POST',
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiKey: 'fixture',
      version: 0,
    },
    { aiSettingsKey: secret },
  );
  const q = parseTexText(
    String.raw`\begin{ex}Tính $\frac{1}{2}.\immini{Hình.}{\begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}}\loigiai{Nguồn đáp án sai cũng giữ nguyên.}\end{ex}`,
  )[0];
  const { upsertQuestions } = await import('../server/question-storage');
  await upsertQuestions(db, [q]);
  const before = (await db.query('SELECT * FROM questions')).rows;
  const response = await adminAiRoute(
    db,
    '/api/admin/ai/classify',
    'POST',
    { repair: true, save: true, questions: [q] },
    {
      aiSettingsKey: secret,
      fetchGemini: async (_url, init) => {
        const data = JSON.parse(JSON.parse(String(init?.body)).messages.at(-1).content);
        assert.deepEqual(Object.keys(data.questions[0]).sort(), ['id', 'statement']);
        assert(!String(init?.body).includes('Nguồn đáp án sai'));
        assert(!String(init?.body).includes('\\\\draw'));
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [
                    {
                      id: q.id,
                      topicIds: [topic],
                      reason: 'Chỉ nhận dạng.',
                      statementRaw: 'Không được lưu',
                      solutionRaw: 'Không được lưu',
                      question: { statementRaw: 'Không được lưu' },
                    },
                  ],
                }),
              },
            },
          ],
        });
      },
    },
  );
  assert.deepEqual((await db.query('SELECT * FROM questions')).rows, before);
  assert.equal((await db.query('SELECT topic_id FROM question_topics')).rows[0].topic_id, topic);
  assert.equal((await db.query('SELECT id FROM question_revisions')).rows.length, 0);
  assert('items' in response && !('question' in response.items![0]));
});

test('older normalized upload drafts are restored from their retained original before classification', async () => {
  const original = parseTexText(
    String.raw`\begin{ex}Tính $\frac{1}{2}$.\immini{Đề.}{Hình.}\loigiai{$3$.}\end{ex}`,
  )[0];
  const normalized = normalizeEssayQuestion(original);
  const { uploadedQuestion } = await import('../shared/uploadedQuestion');
  const restored = uploadedQuestion(normalized);
  assert.equal(restored.id, original.id);
  assert.equal(restored.raw, original.raw);
  assert.equal(restored.statementRaw, original.statementRaw);
  assert.equal(restored.solutionRaw, original.solutionRaw);
});

test('slow background AI owns a long lease and connection failures retry in a minute even after many failures', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  const topic = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO topics(id,title,description,published) VALUES(?,'Đại số','Phương trình',1)",
    )
    .bind(topic)
    .run();
  await adminAiRoute(
    db,
    '/api/admin/ai/settings',
    'POST',
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'fixture',
      apiKey: 'fixture',
      version: 0,
    },
    { aiSettingsKey: secret },
  );
  await upload(db, parseTexText(String.raw`\begin{bt}Giải $x+1=2$.\end{bt}`));
  await db.prepare('UPDATE automatic_import_sources SET attempts=8').run();
  const began = Date.now();
  await processAutomaticImports(db, {
    aiSettingsKey: secret,
    fetchGemini: async (_url, init) => {
      const row = await db
        .prepare("SELECT lease_until FROM automatic_import_sources WHERE state='working'")
        .first();
      assert(Number(row!.lease_until) > began + 180000);
      // Expiry of the old 120s lease must not steal a slow active task.
      assert.equal((await claimAutomaticImports(db, began + 120001)).length, 0);
      throw new TypeError('temporary network error');
    },
  });
  const job = (await automaticImportJobs(db))[0];
  assert.equal(job.waiting, 1);
  assert.equal(job.published, 0);
  assert(job.nextAttempt! >= began + 60000 && job.nextAttempt! < Date.now() + 61000);
  assert.match(job.reason, /tạm gián đoạn/);
});

test('expired work is reported as waiting, never as permanently active', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  await upload(runtime.db, parseTexText(String.raw`\begin{bt}Tính $2+2$.\end{bt}`));
  await claimAutomaticImports(runtime.db, Date.now() - 130000);
  const job = (await automaticImportJobs(runtime.db))[0];
  assert.equal(job.waiting, 1);
  assert.equal(job.working, 0);
  assert(job.nextAttempt! < Date.now());
});
