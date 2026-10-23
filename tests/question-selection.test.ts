import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime';
import { createTeacher } from '../server/auth';
import { upsertQuestions } from '../server/app';

test('select all pages returns only matching IDs, excludes later inserts and protects full selected sources', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  await createTeacher(runtime.db, 'select@example.test', 'selection-fixture-password');
  async function req(route: string, body?: unknown, cookie = '') {
    const response = await fetch(new URL('/api' + route, runtime.url), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Cookie: cookie,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
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
      email: 'select@example.test',
      password: 'selection-fixture-password',
    })
  ).cookie;
  const questions = Array.from({ length: 507 }, (_, i) => ({
    id: crypto.randomUUID(),
    number: 2,
    label: `Chọn nguồn ${i}`,
    sourceType: 'tex',
    statementRaw: 'Tìm x. 100%_nguồn',
    solutionRaw: 'Đáp án bí mật',
    raw: 'Nguồn gốc',
    published: true,
  }));
  for (let i = 0; i < questions.length; i += 100)
    await upsertQuestions(runtime.db, questions.slice(i, i + 100));
  const topic = crypto.randomUUID();
  await runtime.db.prepare("INSERT INTO topics(id,title) VALUES(?, 'Chuyên đề')").bind(topic).run();
  await runtime.db
    .prepare('INSERT INTO question_topics(question_id,topic_id) VALUES(?,?)')
    .bind(questions[0].id, topic)
    .run();
  const first = await req(
    '/questions/selection?number=2&status=published&search=100%25_',
    undefined,
    admin,
  );
  assert.equal(first.status, 200);
  assert.equal(first.data.ids.length, 500);
  assert(first.data.nextCursor);
  assert(!JSON.stringify(first.data).includes('Đáp án bí mật'));
  const future = {
    ...questions[0],
    id: crypto.randomUUID(),
    createdAt: '2099-01-01T00:00:00.000Z',
  };
  await upsertQuestions(runtime.db, [future]);
  await runtime.db
    .prepare('UPDATE questions SET created_at=? WHERE id=?')
    .bind(future.createdAt, future.id)
    .run();
  const next = await req(
    '/questions/selection?' +
      new URLSearchParams({
        number: '2',
        status: 'published',
        search: '100%_',
        cutoff: first.data.cutoff,
        cursor: first.data.nextCursor,
      }),
    undefined,
    admin,
  );
  assert.equal(next.data.ids.length, 7);
  assert.equal(next.data.nextCursor, null);
  assert.equal(new Set([...first.data.ids, ...next.data.ids]).size, 507);
  const filtered = await req('/questions/selection?topicId=' + topic, undefined, admin);
  assert.deepEqual(filtered.data.ids, [questions[0].id]);
  assert.equal((await req('/questions/selection', undefined, admin)).data.ids.length, 500);
  assert.equal(
    (await req('/questions/selection?status=draft', undefined, admin)).data.ids.length,
    0,
  );
  const ids = [questions[506].id, questions[0].id];
  const selected = await req('/questions/selected', { ids }, admin);
  assert.deepEqual(
    selected.data.items.map((q: any) => q.id),
    ids,
  );
  assert.equal(selected.data.items[0].solutionRaw, 'Đáp án bí mật');
  assert.deepEqual(selected.data.items[1].topicIds, [topic]);
  assert.equal((await req('/questions/selected', { ids: [...ids, ids[0]] }, admin)).status, 400);
  assert.equal(
    (await req('/questions/selected', { ids: [crypto.randomUUID()] }, admin)).status,
    409,
  );
  assert.equal((await req('/questions/selection')).status, 401);
  assert.equal((await req('/questions/selected', { ids })).status, 401);
  await runtime.db.prepare("INSERT INTO access_codes(code) VALUES('SELECT01')").run();
  const student = (
    await req('/auth/student', {
      studentName: 'Học sinh',
      studentClass: '9A',
      accessCode: 'SELECT01',
    })
  ).cookie;
  assert.equal((await req('/questions/selection', undefined, student)).status, 403);
  assert.equal((await req('/questions/selected', { ids }, student)).status, 403);
});
