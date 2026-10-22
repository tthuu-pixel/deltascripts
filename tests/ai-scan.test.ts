import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime.ts';
import { createTeacher } from '../server/auth.ts';
import { upsertQuestions } from '../server/app.ts';

test('whole-bank AI scan uses a stable cursor, includes all types/drafts and excludes later inserts and deleted questions', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  await createTeacher(runtime.db, 'scan@example.test', 'scan-fixture-password-2026');
  async function req(path: string, body?: unknown, cookie = '') {
    const response = await fetch(new URL('/api' + path, runtime.url), {
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
      email: 'scan@example.test',
      password: 'scan-fixture-password-2026',
    })
  ).cookie;
  await req('/access-codes', { code: 'SCAN0001' }, admin);
  const student = (
    await req('/auth/student', { studentName: 'HS', studentClass: '9A', accessCode: 'SCAN0001' })
  ).cookie;
  assert.equal((await req('/admin/ai/scan')).status, 401);
  assert.equal((await req('/admin/ai/scan', undefined, student)).status, 403);
  const items = Array.from({ length: 123 }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Bài ${i}`,
    number: (i % 7) + 1,
    sourceType: 'tex',
    statementRaw: `Đề $${i}+1$.`,
    solutionRaw: 'Private answer',
    raw: 'Private original',
    published: i % 2 === 0,
  }));
  for (let i = 0; i < items.length; i += 100)
    await upsertQuestions(runtime.db, items.slice(i, i + 100));
  await runtime.db.prepare('UPDATE questions SET active=0 WHERE id=?').bind(items[0].id).run();
  const first = await req('/admin/ai/scan', undefined, admin);
  assert.equal(first.status, 200);
  assert.equal(first.data.total, 122);
  assert.equal(first.data.items.length, 50);
  const later = { ...items[0], id: crypto.randomUUID() };
  await upsertQuestions(runtime.db, [later]);
  await runtime.db
    .prepare('UPDATE questions SET created_at=? WHERE id=?')
    .bind('2100-01-01T00:00:00.000Z', later.id)
    .run();
  const received = [...first.data.items];
  let cursor = first.data.nextCursor;
  while (cursor) {
    const next = await req(
      '/admin/ai/scan?' + new URLSearchParams({ cutoff: first.data.cutoff, cursor }),
      undefined,
      admin,
    );
    assert.equal(next.status, 200);
    received.push(...next.data.items);
    cursor = next.data.nextCursor;
  }
  assert.equal(received.length, 122);
  assert.equal(new Set(received.map((q) => q.id)).size, 122);
  assert.deepEqual(
    received.map((q) => q.id).sort(),
    items
      .slice(1)
      .map((q) => q.id)
      .sort(),
  );
  assert(received.some((q) => !q.published));
  assert(!JSON.stringify(received).includes('Private answer'));
  assert(!JSON.stringify(received).includes('Private original'));
  assert.equal((await req('/admin/ai/scan?cursor=bad', undefined, admin)).status, 400);
  const topicIds = Array.from({ length: 11 }, () => crypto.randomUUID());
  for (const id of topicIds)
    await runtime.db
      .prepare('INSERT INTO topics(id,title,icon,color) VALUES(?,?,?,?)')
      .bind(id, 'Chuyên đề thử giới hạn', 'topics', 'blue')
      .run();
  const classify = (ids: string[], mode: string) =>
    req('/questions/classify', { ids: [items[1].id], topicIds: ids, mode }, admin);
  assert.equal((await classify(topicIds.slice(0, 10), 'replace')).status, 200);
  assert.equal((await classify([topicIds[10]], 'add')).status, 400);
  assert.equal((await classify(topicIds.slice(0, 3), 'add')).status, 200);
  assert.equal(
    (await runtime.db
      .prepare('SELECT count(*) AS n FROM question_topics WHERE question_id=?')
      .bind(items[1].id)
      .first())!.n,
    10,
  );
});
