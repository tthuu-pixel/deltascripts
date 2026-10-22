import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unstable_splitSqlQuery } from 'wrangler';
import { createRuntime } from './runtime.ts';
import { createTeacher } from '../server/auth.ts';
import { defaultStudentSettings } from '../shared/content.ts';
import { randomQuestionSql, query } from '../server/database.ts';

const topic = (title: string, published = false) => ({
  title,
  category: 'Tự biên soạn',
  description: 'Nội dung của chủ web',
  theory: String.raw`Căn thức $\sqrt{49}=7$.`,
  preamble: '',
  icon: 'radical',
  color: 'blue',
  published,
});
const question = (number: number, published: boolean, topicIds: string[]) => ({
  id: crypto.randomUUID(),
  number,
  label: `Nguồn ${number}`,
  sourceType: 'tex',
  statementRaw: `Bài riêng $${number}+1$.`,
  solutionRaw: 'Lời giải $2$.',
  published,
  topicIds,
});

test('managed content: drafts, publication, classification and settings are controlled only by the administrator', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  await createTeacher(runtime.db, 'content@example.test', 'content-test-password');
  async function req(path: string, body?: unknown, cookie = '') {
    const res = await fetch(new URL('/api' + path, runtime.url), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Cookie: cookie,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      data: (await res.json()) as any,
      cookie: res.headers.get('set-cookie')?.split(';')[0] || '',
    };
  }
  const admin = (
    await req('/auth/teacher', { email: 'content@example.test', password: 'content-test-password' })
  ).cookie;
  await req('/access-codes', { code: 'CONTENT1' }, admin);
  const student = (
    await req('/auth/student', {
      studentName: 'Người học',
      studentClass: '9A',
      accessCode: 'CONTENT1',
    })
  ).cookie;
  const empty = await req('/student-content', undefined, student);
  assert.deepEqual(empty.data.topics, []);
  assert.equal(empty.data.settings.tabs.length, 4);
  assert.equal((await req('/topics')).status, 401);
  assert.equal((await req('/student-settings', undefined, student)).status, 403);
  assert.equal((await req('/topics/save', { topic: topic('Không được') }, student)).status, 403);
  const draft = (await req('/topics/save', { topic: topic('Chuyên đề đang soạn') }, admin)).data
    .topic;
  const published = (await req('/topics/save', { topic: topic('Chuyên đề của tôi', true) }, admin))
    .data.topic;
  const publicList = await req('/topics', undefined, student);
  assert.deepEqual(
    publicList.data.items.map((x: any) => x.id),
    [published.id],
  );
  assert.equal((await req('/topic?id=' + draft.id, undefined, student)).status, 404);
  assert.equal((await req('/topic-questions?topicId=' + draft.id, undefined, student)).status, 404);
  assert.equal(
    (await req('/topic?id=' + draft.id, undefined, admin)).data.topic.theory,
    draft.theory,
  );
  const first = question(1, false, [published.id, draft.id]);
  const second = question(2, true, [published.id]);
  assert.equal((await req('/questions', { questions: [first, second] }, admin)).status, 200);
  assert.equal((await req('/questions', { questions: [first, second] }, admin)).status, 200);
  assert.equal((await req('/questions/random?number=1', undefined, student)).status, 404);
  assert.equal((await req('/exam', undefined, student)).status, 422);
  let list = await req('/topic-questions?topicId=' + published.id, undefined, student);
  assert.equal(list.data.total, 1);
  assert.deepEqual(
    list.data.items.map((q: any) => q.id),
    [second.id],
  );
  assert.equal(
    (await req('/topics', undefined, admin)).data.items.find((x: any) => x.id === published.id)
      .questionCount,
    1,
  );
  let drafts = await req('/questions?status=draft&topicId=' + published.id, undefined, admin);
  assert.equal(drafts.data.total, 1);
  assert.deepEqual(drafts.data.items[0].topicIds.sort(), [published.id, draft.id].sort());
  assert.equal((await req('/questions?search=%25', undefined, admin)).data.total, 0);
  assert.equal(
    (await req('/questions/classify', { ids: [first.id], published: true, number: 2 }, student))
      .status,
    403,
  );
  assert.equal(
    (await req('/questions/classify', { ids: [first.id], published: true, number: 2 }, admin))
      .status,
    200,
  );
  assert.equal((await query(runtime.db, randomQuestionSql(true), [2])).rows.length, 1);
  assert.equal(
    (await req('/topic-questions?topicId=' + published.id + '&number=2', undefined, student)).data
      .total,
    2,
  );
  assert.equal(
    (await req('/topics', undefined, admin)).data.items.find((x: any) => x.id === published.id)
      .questionCount,
    2,
  );
  const missing = crypto.randomUUID();
  assert.equal(
    (
      await req(
        '/questions/classify',
        { ids: [first.id], number: 4, topicIds: [missing], mode: 'replace' },
        admin,
      )
    ).status,
    409,
  );
  assert.equal((await req('/questions?number=4', undefined, admin)).data.total, 0);
  assert.equal(
    (
      await req(
        '/questions/classify',
        { ids: [second.id], topicIds: [draft.id], mode: 'add' },
        admin,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await req(
        '/questions/classify',
        { ids: [second.id], topicIds: [draft.id], mode: 'add' },
        admin,
      )
    ).status,
    200,
  );
  assert.equal(
    (await req('/topics', undefined, admin)).data.items.find((x: any) => x.id === draft.id)
      .questionCount,
    2,
  );
  assert.equal(
    (
      await req(
        '/questions/classify',
        { ids: [second.id], topicIds: [published.id], mode: 'remove' },
        admin,
      )
    ).status,
    200,
  );
  assert.equal(
    (await req('/topic-questions?topicId=' + published.id, undefined, student)).data.total,
    1,
  );
  assert.equal(
    (await req('/questions/classify', { ids: [second.id], topicIds: [], mode: 'replace' }, admin))
      .status,
    200,
  );
  assert.equal((await req('/questions?topicId=unassigned', undefined, admin)).data.total, 1);
  assert.equal(
    (await req('/questions/classify', { ids: [first.id], published: false }, admin)).status,
    200,
  );
  assert.equal(
    (await req('/topic-questions?topicId=' + published.id, undefined, student)).data.total,
    0,
  );
  assert.equal(
    (await req('/topics/save', { topic: { ...draft, published: true } }, admin)).status,
    200,
  );
  assert.equal(
    (await req('/topics/save', { topic: { ...draft, title: 'Stale editor' } }, admin)).status,
    409,
  );
  assert.equal(
    (await req('/questions/classify', { ids: [first.id], published: true }, admin)).status,
    200,
  );
  await req('/questions/delete', { ids: [first.id] }, admin);
  assert.equal(
    (await req('/topics', undefined, admin)).data.items.find((x: any) => x.id === draft.id)
      .questionCount,
    0,
  );
  assert.equal(
    (await req('/topics/delete', { id: published.id, version: published.version }, admin)).status,
    200,
  );
  assert.equal((await req('/questions', undefined, admin)).data.total, 1);
  const more = Array.from({ length: 35 }, () => crypto.randomUUID());
  for (const id of more)
    await runtime.db
      .prepare('INSERT INTO topics(id,title) VALUES(?,?)')
      .bind(id, 'Thứ tự riêng')
      .run();
  const ordered = (await req('/topics', undefined, admin)).data.items
    .map((x: any) => x.id)
    .reverse();
  assert.equal((await req('/topics/reorder', { ids: ordered }, admin)).status, 200);
  assert.deepEqual(
    (await req('/topics', undefined, admin)).data.items.map((x: any) => x.id),
    ordered,
  );
  const cfg = structuredClone(defaultStudentSettings);
  cfg.heroTitle = 'Lớp Toán của tôi';
  cfg.guideContent = String.raw`Bài hướng dẫn $x^2$.`;
  cfg.tabs.reverse();
  cfg.tabs.find((x) => x.key === 'topics')!.label = 'Chuyên đề của thầy';
  cfg.tabs.find((x) => x.key === 'guide')!.visible = false;
  assert.equal((await req('/student-settings', { settings: cfg }, student)).status, 403);
  assert.equal(
    (
      await req(
        '/student-settings',
        { settings: { ...cfg, tabs: cfg.tabs.map((x) => ({ ...x, visible: false })) } },
        admin,
      )
    ).status,
    400,
  );
  assert.equal((await req('/student-settings', { settings: cfg }, admin)).status, 200);
  assert.equal((await req('/student-settings', { settings: cfg }, admin)).status, 409);
  const live = (await req('/student-content', undefined, student)).data.settings;
  assert.equal(live.heroTitle, cfg.heroTitle);
  assert.equal(live.tabs[0].key, 'guide');
  assert.equal(live.tabs[0].visible, false);
});

test('large imports respect D1 binding limits and topic counters; hard deletes preserve counts', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const { upsertQuestions } = await import('../server/app.ts');
  const ids = Array.from({ length: 10 }, () => crypto.randomUUID());
  for (const id of ids)
    await runtime.db
      .prepare('INSERT INTO topics(id,title) VALUES(?,?)')
      .bind(id, 'Tự biên soạn')
      .run();
  const items = Array.from({ length: 100 }, (_, i) => question((i % 7) + 1, i % 3 !== 0, ids));
  await upsertQuestions(runtime.db, items);
  await upsertQuestions(runtime.db, items);
  const published = items.filter((q) => q.published).length;
  assert.equal(
    (await runtime.db.query('SELECT count(*) AS n FROM question_topics')).rows[0].n,
    1000,
  );
  assert(
    (await runtime.db.query('SELECT question_count FROM topics')).rows.every(
      (r) => r.question_count === published,
    ),
  );
  const removed = items.find((q) => q.published)!;
  await runtime.db.prepare('DELETE FROM questions WHERE id=?').bind(removed.id).run();
  assert(
    (await runtime.db.query('SELECT question_count FROM topics')).rows.every(
      (r) => r.question_count === published - 1,
    ),
  );
  for (const number of [1, 2, 3, 4, 5, 6, 7]) {
    const pool = await runtime.db.query(
      'SELECT slot FROM questions WHERE active=1 AND published=1 AND number=? ORDER BY slot',
      [number],
    );
    const count = await runtime.db
      .prepare('SELECT total FROM question_counts WHERE number=?')
      .bind(number)
      .first<{ total: number }>();
    assert.equal(pool.rows.length, count!.total);
    assert.deepEqual(
      pool.rows.map((q) => q.slot),
      pool.rows.map((_, i) => i),
    );
  }
});

test('content migration preserves all legacy questions and published random pools', async (t) => {
  const runtime = await createRuntime({ initialize: false });
  t.after(() => runtime.close());
  for (const name of ['0001_d1.sql', '0002_teacher_setup.sql']) {
    const sql = await readFile(new URL('../migrations/' + name, import.meta.url), 'utf8');
    await runtime.db.batch(unstable_splitSqlQuery(sql).map((s) => runtime.db.prepare(s)));
  }
  for (let n = 1; n <= 7; n++)
    await runtime.db
      .prepare(
        'INSERT INTO questions(id,label,number,source_type,statement_raw,solution_raw) VALUES(?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        'Nguồn cũ',
        n,
        'tex',
        'Giữ nguyên nguồn $x$',
        'Giữ nguyên lời giải',
      )
      .run();
  const migration = await readFile(
    new URL('../migrations/0003_managed_content.sql', import.meta.url),
    'utf8',
  );
  await runtime.db.batch(unstable_splitSqlQuery(migration).map((s) => runtime.db.prepare(s)));
  const rows = (await query(runtime.db, randomQuestionSql(false))).rows;
  assert.equal(rows.length, 7);
  const legacy = randomQuestionSql(false).replace('q.published=1 AND ', '');
  assert.equal((await query(runtime.db, legacy)).rows.length, 7);
  assert(
    rows.every(
      (q) =>
        q.published === 1 &&
        q.statementRaw === 'Giữ nguyên nguồn $x$' &&
        q.solutionRaw === 'Giữ nguyên lời giải',
    ),
  );
  assert.equal((await runtime.db.query('SELECT count(*) AS n FROM topics')).rows[0].n, 0);
});
