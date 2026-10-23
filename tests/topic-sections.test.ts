import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unstable_splitSqlQuery } from 'wrangler';
import { createRuntime } from './runtime.ts';
import { createTeacher } from '../server/auth.ts';
import { upsertQuestions } from '../server/app.ts';
import { topicIcons } from '../shared/content.ts';
import { topicRandomQuestionSql, query } from '../server/database.ts';

test('examples and picture-only icon selection persist; topic practice draws only published questions of the selected topic regardless of source order', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  await createTeacher(runtime.db, 'sections@example.test', 'topic-sections-test-password');
  async function req(path: string, body?: unknown, cookie = '') {
    const response = await fetch(new URL('/api' + path, runtime.url), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Cookie: cookie,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: (await response.json()) as any,
      cookie: response.headers.get('set-cookie')?.split(';')[0] || '',
    };
  }
  const admin = (
    await req('/auth/teacher', {
      email: 'sections@example.test',
      password: 'topic-sections-test-password',
    })
  ).cookie;
  await req('/access-codes', { code: 'SECTIONS' }, admin);
  const student = (
    await req('/auth/student', {
      studentName: 'Học bài',
      studentClass: '9A',
      accessCode: 'SECTIONS',
    })
  ).cookie;
  assert.equal(topicIcons.length, 100);
  assert.equal(new Set(topicIcons).size, 100);
  const source = {
    title: 'Lập phương trình',
    category: 'Đại số',
    description: 'Tự biên soạn',
    theory: 'Lý thuyết $x+1=2$.',
    preamble: '',
    examples: String.raw`Ví dụ $\sqrt{49}=7$. \begin{tikzpicture}\draw (0,0)--(\R,1);\end{tikzpicture}`,
    examplesPreamble: String.raw`\def\R{2.5}`,
    icon: topicIcons[99],
    color: 'red',
    published: true,
  };
  const created = await req('/topics/save', { topic: source }, admin);
  assert.equal(created.status, 200);
  const saved = created.data.topic;
  const found = (await req('/topic?id=' + saved.id, undefined, student)).data.topic;
  assert.equal(found.examples, source.examples);
  assert.equal(found.examplesPreamble, source.examplesPreamble);
  assert.equal(found.icon, topicIcons[99]);
  const oldEditor = { ...saved };
  delete oldEditor.examples;
  delete oldEditor.examplesPreamble;
  const legacy = await req('/topics/save', { topic: oldEditor }, admin);
  assert.equal(legacy.status, 200);
  assert.equal(legacy.data.topic.examples, source.examples);
  assert.equal(
    (await req('/topics/save', { topic: { ...legacy.data.topic, icon: 'not-an-icon' } }, admin))
      .status,
    400,
  );
  assert.equal(
    (await req('/topics/save', { topic: { ...legacy.data.topic, examples: 42 } }, admin)).status,
    400,
  );
  const hidden = (
    await req(
      '/topics/save',
      { topic: { ...source, title: 'Chưa công bố', published: false } },
      admin,
    )
  ).data.topic;
  const make = (number: number, published: boolean, ids: string[]) => ({
    id: crypto.randomUUID(),
    number,
    label: 'Bài riêng',
    sourceType: 'tex',
    statementRaw: 'Nguồn $x+1=2$.',
    solutionRaw: 'Lời giải $x=1$.',
    topicIds: ids,
    published,
  });
  const first = make(1, true, [saved.id]),
    second = make(1, true, [saved.id]),
    draft = make(1, false, [saved.id]),
    otherType = make(2, true, [saved.id]),
    otherTopic = make(1, true, [hidden.id]);
  await upsertQuestions(runtime.db, [first, second, draft, otherType, otherTopic]);
  assert.equal((await req(`/topic-question/random?topicId=${saved.id}&number=1`)).status, 401);
  assert.equal(
    (await req(`/topic-question/random?topicId=${hidden.id}&number=1`, undefined, student)).status,
    404,
  );
  for (let i = 0; i < 12; i++) {
    const random = await req(`/topic-question/random?topicId=${saved.id}`, undefined, student);
    assert.equal(random.status, 200);
    assert([first.id, second.id, otherType.id].includes(random.data.question.id));
  }
  // A large unrelated bank must not be scanned to choose an exercise from a small topic.
  for (let i = 0; i < 1000; i += 100)
    await upsertQuestions(
      runtime.db,
      Array.from({ length: 100 }, () => make(1, true, [])),
    );
  const measured = await query(runtime.db, topicRandomQuestionSql, [saved.id]);
  assert(measured.meta.rows_read < 100, `Scoped draw read ${measured.meta.rows_read} rows`);
  t.diagnostic(`Scoped draw read ${measured.meta.rows_read} rows with 1000 unrelated questions.`);
});

test('examples migration preserves an already-created topic and its TeX source', async (t) => {
  const runtime = await createRuntime({ initialize: false });
  t.after(() => runtime.close());
  for (const name of ['0001_d1.sql', '0002_teacher_setup.sql', '0003_managed_content.sql']) {
    const sql = await readFile(new URL('../migrations/' + name, import.meta.url), 'utf8');
    await runtime.db.batch(unstable_splitSqlQuery(sql).map((s) => runtime.db.prepare(s)));
  }
  const id = crypto.randomUUID(),
    theory = String.raw`Lý thuyết có sẵn $25\%$. \begin{tikzpicture}\draw (0,0)--(2.5,1);\end{tikzpicture}`;
  await runtime.db
    .prepare(
      'INSERT INTO topics(id,title,theory,preamble,icon,published,version) VALUES(?,?,?,?,?,?,?)',
    )
    .bind(id, 'Chuyên đề đã tạo', theory, String.raw`\def\R{2.5}`, 'equation', 1, 4)
    .run();
  const before = (await runtime.db.query('SELECT * FROM topics')).rows[0];
  const migration = await readFile(
    new URL('../migrations/0004_topic_examples.sql', import.meta.url),
    'utf8',
  );
  await runtime.db.batch(unstable_splitSqlQuery(migration).map((s) => runtime.db.prepare(s)));
  const after = (await runtime.db.query('SELECT * FROM topics')).rows[0];
  for (const [key, value] of Object.entries(before)) assert.equal(after[key], value);
  assert.equal(after.examples, '');
  assert.equal(after.examples_preamble, '');
});
