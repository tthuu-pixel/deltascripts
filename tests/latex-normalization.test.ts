import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime';
import { parseTexText } from '../shared/texParser';
import { upsertQuestions } from '../server/question-storage';
import { adminAiRoute } from '../server/admin-ai';
import {
  normalizationRoute,
  normalizationJobs,
  processLatexNormalizations,
} from '../server/latex-normalizations';
import {
  acceptLatexNormalization,
  prepareLatexNormalization,
  normalizationSignature,
} from '../shared/latexNormalization';
import {
  automaticImportsRoute,
  automaticImportJobs,
  claimAutomaticImports,
  publishAutomaticImport,
} from '../server/automatic-imports';
import { processScheduledAi } from '../server/scheduled-ai';
import type { Question } from '../src/types';
import { sendAutomaticUpload } from '../src/services/automaticUpload';

const secret = 'normalization-test-encryption-secret-32-characters';
const drawing = String.raw`\begin{tikzpicture}[scale=0.6]
  % keep exact drawing bytes
  \draw (2.5,0)--(0,1);\node at (0,0) {$\frac{1}{2}$};
\end{tikzpicture}`;
async function config(db: any) {
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
}
async function enqueue(db: any, ids: string[], topicId = '', id = crypto.randomUUID()) {
  await normalizationRoute(db, '/api/admin/normalizations/start', 'POST', { id, ids, topicId });
  return id;
}
const echo: typeof fetch = async (_url, init) => {
  const body = JSON.parse(String(init?.body)),
    input = JSON.parse(body.messages.at(-1).content);
  assert(body.messages[0].content.includes('Giữ nguyên 100% nội dung gốc'));
  assert(body.messages[0].content.includes('không giải'));
  return Response.json({
    choices: [
      {
        message: {
          content: JSON.stringify({
            items: input.questions.map((q: any) => ({
              id: q.id,
              statementRaw: q.statement,
              solutionRaw: q.solution,
            })),
          }),
        },
      },
    ],
  });
};

test('normalization preserves wrong answers, immini, protected TikZ, choices and semantic content', () => {
  const q = parseTexText(
    String.raw`\begin{ex}\immini{Tính $\frac{1}{2}$; $2+2$.}{` +
      drawing +
      String.raw`}\loigiai{Ta có $2+2=5$.}\end{ex}`,
  )[0];
  const input = prepareLatexNormalization(q);
  const next = acceptLatexNormalization(input, {
    statementRaw: input.statement.text,
    solutionRaw: input.solution.text,
  });
  assert.equal(next.exerciseEnvironment, 'bt');
  assert(next.statementRaw.includes('\\immini'));
  assert(next.statementRaw.includes('\\dfrac{1}{2}'));
  assert(next.statementRaw.includes(drawing));
  assert(next.solutionRaw.includes('2+2=5'));
  assert.throws(
    () =>
      acceptLatexNormalization(input, {
        statementRaw: input.statement.text,
        solutionRaw: input.solution.text.replace('2+2=5', '2+2=4'),
      }),
    /thay đổi nội dung/,
  );
  assert.throws(() =>
    acceptLatexNormalization(input, {
      statementRaw: input.statement.text.replace(/DSLOCK\w+END/, ''),
      solutionRaw: input.solution.text,
    }),
  );
  const mcq = parseTexText(
    String.raw`\begin{ex}Chọn $2$.\choice{1}{\True 2}{3}{4}\loigiai{Chọn $2$.}\end{ex}`,
  )[0];
  const locked = prepareLatexNormalization(mcq);
  assert.equal(
    acceptLatexNormalization(locked, {
      statementRaw: locked.statement.text,
      solutionRaw: locked.solution.text,
    }).exerciseEnvironment,
    'ex',
  );
  assert.throws(() =>
    acceptLatexNormalization(locked, {
      statementRaw: locked.statement.text.replace('\\True 2', '2'),
      solutionRaw: locked.solution.text,
    }),
  );
  const short = parseTexText(String.raw`\begin{ex}Tính $2+2$.\shortans[oly]{4}\end{ex}`)[0];
  const ready = prepareLatexNormalization(short);
  assert.equal(
    acceptLatexNormalization(ready, {
      statementRaw: ready.statement.text,
      solutionRaw: ready.solution.text,
    }).exerciseEnvironment,
    'ex',
  );
  assert.throws(() =>
    acceptLatexNormalization(ready, {
      statementRaw: ready.statement.text,
      solutionRaw: 'Thêm lời giải $4$.',
    }),
  );
});

test('formatting equivalences preserve command boundaries, signs, exponents and equation grouping', () => {
  for (const [a, b] of [
    [String.raw`$\frac{1}{2}$`, String.raw`$\dfrac{1}{2}$`],
    [String.raw`$x\ge 2.5$`, String.raw`$x\geq 2{,}5$`],
    [String.raw`\textbf{Tính $\frac{1}{2}$.}`, String.raw`Tính $\dfrac{1}{2}$.`],
    [
      String.raw`\begin{enumerate}[a)]\item[1)] Tính $2$.\end{enumerate}`,
      String.raw`\begin{enumerate}\item Tính $2$.\end{enumerate}`,
    ],
    [String.raw`$x=2\Rightarrow y=3$.`, String.raw`$x=2$ Suy ra $y=3$.`],
  ]) {
    assert.equal(normalizationSignature(a), normalizationSignature(b));
  }
  for (const [a, b] of [
    [String.raw`$\sin x$`, String.raw`$\sinx$`],
    [String.raw`$x^{a+b}$`, String.raw`$x^a+b$`],
    ['$x+1=3$', '$x-1=3$'],
    ['$A=B$', '$a=B$'],
  ])
    assert.notEqual(normalizationSignature(a), normalizationSignature(b));
});

test('selected topic jobs persist, only normalize selected questions, keep links/publication and save source history', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  await config(db);
  const topic = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO topics(id,title,description,published) VALUES(?,'Căn thức','Phân số và căn thức.',1)",
    )
    .bind(topic)
    .run();
  const qs = Array.from({ length: 4 }, (_, i) => ({
    ...parseTexText(
      `\\begin{ex}Tính $\\frac{${i + 1}}{2}$.\\loigiai{Giữ đáp án $${i + 8}$.}\\end{ex}`,
    )[0],
    topicIds: [topic],
    published: i % 2 === 0,
  }));
  await upsertQuestions(db, qs);
  const before = (await db.query('SELECT * FROM questions ORDER BY id')).rows;
  const id = await enqueue(
    db,
    qs.slice(0, 3).map((q) => q.id),
    topic,
  );
  await enqueue(
    db,
    qs.slice(0, 3).map((q) => q.id),
    topic,
    id,
  );
  assert.equal((await normalizationJobs(db))[0].received, 3);
  await assert.rejects(() => enqueue(db, [qs[3].id], topic, id), /lựa chọn khác/);
  await processLatexNormalizations(db, { aiSettingsKey: secret, fetchGemini: echo });
  await processLatexNormalizations(db, { aiSettingsKey: secret, fetchGemini: echo });
  const job = (await normalizationJobs(db))[0];
  assert.equal(job.completed, 3);
  assert.equal(job.review, 0);
  const after = (await db.query('SELECT * FROM questions ORDER BY id')).rows;
  for (const row of after) {
    const old = before.find((q) => q.id === row.id)!;
    assert.equal(row.published, old.published);
    assert.equal(row.label, old.label);
    assert.equal(row.number, old.number);
    if (qs[3].id === row.id) assert.deepEqual(row, old);
    else assert(String(row.statement_raw).includes('\\dfrac'));
  }
  assert.equal(
    (await db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [topic])).rows
      .length,
    4,
  );
  assert.equal((await db.query('SELECT id FROM question_revisions')).rows.length, 3);
  const repeat = await enqueue(
    db,
    qs.slice(0, 2).map((q) => q.id),
    topic,
  );
  await processLatexNormalizations(db, { aiSettingsKey: secret, fetchGemini: echo });
  assert.equal((await normalizationJobs(db)).find((j) => j.id === repeat)!.completed, 2);
  assert.equal((await db.query('SELECT id FROM question_revisions')).rows.length, 3);
});

test('normalization rejects rewritten math and stale AI responses without changing source', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  await config(db);
  const q = parseTexText(String.raw`\begin{bt}Tính $2+2$.\loigiai{$2+2=5$.}\end{bt}`)[0];
  await upsertQuestions(db, [q]);
  await enqueue(db, [q.id]);
  await processLatexNormalizations(db, {
    aiSettingsKey: secret,
    fetchGemini: async (_url, init) => {
      const input = JSON.parse(JSON.parse(String(init?.body)).messages.at(-1).content);
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: input.questions.map((x: any) => ({
                  id: x.id,
                  statementRaw: x.statement,
                  solutionRaw: '$2+2=4$.',
                })),
              }),
            },
          },
        ],
      });
    },
  });
  assert.equal((await normalizationJobs(db))[0].review, 1);
  assert.equal(
    (await db.query('SELECT solution_raw FROM questions')).rows[0].solution_raw,
    q.solutionRaw,
  );
  assert.equal((await db.query('SELECT id FROM question_revisions')).rows.length, 0);
  await enqueue(db, [q.id]);
  await processLatexNormalizations(db, {
    aiSettingsKey: secret,
    fetchGemini: async (url, init) => {
      await db
        .prepare("UPDATE questions SET statement_raw='Chủ trang vừa sửa' WHERE id=?")
        .bind(q.id)
        .run();
      return echo(url, init);
    },
  });
  assert.equal(
    (await db.query('SELECT statement_raw FROM questions')).rows[0].statement_raw,
    'Chủ trang vừa sửa',
  );
  assert.equal((await db.query('SELECT id FROM question_revisions')).rows.length, 0);
  const job = (await normalizationJobs(db)).find((j) => j.waiting > 0)!;
  assert(job);
});

test('clearing imports cancels in-flight work and stale uploads, and preserves the bank', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  const saved = parseTexText(String.raw`\begin{bt}Đã lưu $1$.\end{bt}`)[0];
  await upsertQuestions(db, [saved]);
  const source = parseTexText(String.raw`\begin{bt}Đang nhập $2$.\end{bt}`)[0],
    id = crypto.randomUUID();
  await automaticImportsRoute(db, '/api/admin/imports/start', 'POST', {
    id,
    files: ['file.tex'],
    expected: 1,
  });
  await automaticImportsRoute(db, '/api/admin/imports/items', 'POST', { id, items: [source] });
  const leases = await claimAutomaticImports(db);
  const reply = await automaticImportsRoute(db, '/api/admin/imports/clear', 'POST', {});
  assert('generation' in reply);
  assert.equal(reply.generation, 1);
  assert.equal(await publishAutomaticImport(db, leases[0], source), false);
  assert.equal((await automaticImportJobs(db)).length, 0);
  assert.equal((await db.query('SELECT * FROM automatic_import_sources')).rows.length, 0);
  assert.equal((await db.query('SELECT id FROM questions')).rows.length, 1);
  await assert.rejects(
    () =>
      automaticImportsRoute(db, '/api/admin/imports/start', 'POST', {
        id,
        files: ['file.tex'],
        expected: 1,
      }),
    (e: any) => e.status === 410,
  );
  const next = crypto.randomUUID();
  await automaticImportsRoute(db, '/api/admin/imports/start', 'POST', {
    id: next,
    files: ['new.tex'],
    expected: 1,
    generation: 1,
  });
  assert.equal((await automaticImportJobs(db)).length, 1);
});

test('a cleared browser upload draft is discarded instead of retrying on every return', async () => {
  let removed = false,
    calls = 0;
  const q = parseTexText(String.raw`\begin{bt}Tính $1$.\end{bt}`)[0];
  await assert.rejects(() =>
    sendAutomaticUpload(
      {
        id: crypto.randomUUID(),
        files: ['old.tex'],
        questions: [q],
        offset: 0,
        createdAt: Date.now(),
        generation: 0,
      },
      {
        signal: new AbortController().signal,
        onProgress: () => {},
        store: {
          put: async () => {},
          remove: async () => {
            removed = true;
          },
        },
        api: {
          startAutomaticImport: async () => {
            calls++;
            throw Object.assign(new Error('Cleared'), { status: 410 });
          },
          appendAutomaticImport: async () => {},
          finishAutomaticImport: async () => {},
        },
        wait: async () => {
          throw new Error('No retry');
        },
      },
    ),
  );
  assert(removed);
  assert.equal(calls, 1);
});

test('normalization and clear-import endpoints enforce admin access', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  for (const route of [
    '/api/admin/normalizations',
    '/api/admin/normalizations/start',
    '/api/admin/imports/clear',
  ]) {
    const write = route.endsWith('/start') || route.endsWith('/clear');
    const response = await fetch(
      runtime.url.origin + route,
      write
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
        : undefined,
    );
    assert.equal(response.status, 401);
  }
});

test('table cells and geometry/system formatting retain their structure and meaning', () => {
  const source = parseTexText(
    String.raw`\begin{bt}Bảng:\begin{tabular}{|c|c|}\hline $x$&$1$\\\hline $y$&$2$\\\hline\end{tabular}\end{bt}`,
  )[0];
  const input = prepareLatexNormalization(source);
  assert.throws(() =>
    acceptLatexNormalization(input, {
      statementRaw: input.statement.text.replace('$x$&$1$\\\\', '$x$\\\\&$1$'),
      solutionRaw: '',
    }),
  );
  assert.equal(
    normalizationSignature(String.raw`$\begin{cases}x+y=3\\x-y=1\end{cases}$`),
    normalizationSignature(String.raw`$\heva{&x+y=3\\&x-y=1}$`),
  );
  assert.notEqual(
    normalizationSignature(String.raw`$f(x)=\begin{cases}x&x>0\\0&x=0\end{cases}$`),
    normalizationSignature(String.raw`$f(x)=\heva{&x&x>0\\&0&x=0}$`),
  );
  assert.equal(
    normalizationSignature(String.raw`$\angle ABC$`),
    normalizationSignature(String.raw`$\widehat{ABC}$`),
  );
});

test('scheduled normalization is fair to imports and remains within the D1 Free query limit', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  await config(db);
  const topic = crypto.randomUUID();
  await db
    .prepare("INSERT INTO topics(id,title,description,published) VALUES(?,'Đại số','Biểu thức',1)")
    .bind(topic)
    .run();
  const q = parseTexText(String.raw`\begin{bt}Tính $\frac{1}{2}$.\end{bt}`)[0];
  await upsertQuestions(db, [q]);
  await enqueue(db, [q.id]);
  const importId = crypto.randomUUID(),
    source = parseTexText(String.raw`\begin{bt}Tính $x+9$.\end{bt}`)[0];
  await automaticImportsRoute(db, '/api/admin/imports/start', 'POST', {
    id: importId,
    files: ['new.tex'],
    expected: 1,
  });
  await automaticImportsRoute(db, '/api/admin/imports/items', 'POST', {
    id: importId,
    items: [source],
  });
  await automaticImportsRoute(db, '/api/admin/imports/finish', 'POST', { id: importId });
  let queries = 0;
  const measured = {
    ...db,
    prepare: (sql: string) => {
      queries++;
      return db.prepare(sql);
    },
  };
  const now = Date.now(),
    even = now + (Math.floor(now / 60000) % 2 ? 60000 : 0);
  await processScheduledAi(measured, { aiSettingsKey: secret, fetchGemini: echo }, even);
  assert(queries < 50, `Used ${queries} queries`);
  assert.equal((await normalizationJobs(db))[0].completed, 1);
  assert.equal((await automaticImportJobs(db))[0].waiting, 1);
  await enqueue(db, [q.id]);
  queries = 0;
  await processScheduledAi(
    measured,
    {
      aiSettingsKey: secret,
      fetchGemini: async (_url, init) => {
        const input = JSON.parse(JSON.parse(String(init?.body)).messages.at(-1).content);
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: input.questions.map((x: any) => ({
                    id: x.id,
                    topicIds: [topic],
                    reason: 'Khớp.',
                  })),
                }),
              },
            },
          ],
        });
      },
    },
    even + 60000,
  );
  assert(queries < 50);
  assert.equal((await automaticImportJobs(db))[0].published, 1);
  assert((await normalizationJobs(db)).some((j) => j.waiting === 1));
});

test('skill alternatives and presentation boxes normalize without changing their contents', () => {
  assert.equal(
    normalizationSignature(String.raw`$\hoac{&x=\frac{1}{2}\\&x=-\frac{1}{2}}$`),
    normalizationSignature(
      String.raw`\begin{align*}x=\dfrac{1}{2}&\text{ hoặc }x=-\dfrac{1}{2}\end{align*}`,
    ),
  );
  assert.notEqual(
    normalizationSignature(String.raw`$\hoac{&x=1\\&x=2}$`),
    normalizationSignature(String.raw`$\heva{&x=1\\&x=2}$`),
  );
  assert.equal(
    normalizationSignature(String.raw`\begin{khung4}Giữ $x^2=4$.\end{khung4}`),
    normalizationSignature(String.raw`Giữ $x^2=4$.`),
  );
  assert.equal(
    normalizationSignature(String.raw`\begin{note}Giữ $2$.\end{note}`),
    normalizationSignature(String.raw`\begin{luuy}Giữ $2$.\end{luuy}`),
  );
});

test('decimal formatting never turns a coordinate pair or a set into one scalar', () => {
  assert.equal(
    normalizationSignature(String.raw`$x=2,5$`),
    normalizationSignature(String.raw`$x=2{,}5$`),
  );
  assert.notEqual(
    normalizationSignature(String.raw`$A(2,5)$`),
    normalizationSignature(String.raw`$A(2{,}5)$`),
  );
  assert.notEqual(
    normalizationSignature(String.raw`$\{1,2\}$`),
    normalizationSignature(String.raw`$\{1{,}2\}$`),
  );
});
