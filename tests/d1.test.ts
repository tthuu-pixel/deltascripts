import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRuntime } from './runtime.ts';
import { upsertQuestions } from '../server/app.ts';
import { query, randomQuestionSql } from '../server/database.ts';
import worker from '../server/index.ts';

const question = (number: number) => ({
  id: crypto.randomUUID(),
  number,
  label: `Câu ${number}`,
  sourceType: 'tex',
  statementRaw: 'Tính $1+1$.',
  solutionRaw: 'Đáp án $2$.',
  raw: 'original',
});

test('D1 dense slots stay correct through deletion, reactivation, renumbering and concurrent saves', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const { db } = runtime;
  const originals = Array.from({ length: 37 }, (_, i) => question((i % 7) + 1));
  await upsertQuestions(db, originals);
  async function check() {
    const { rows } = await query(db, 'SELECT number,total FROM question_counts ORDER BY number');
    for (const row of rows) {
      const pool = await query(
        db,
        'SELECT slot FROM questions WHERE active=1 AND number=? ORDER BY slot',
        [row.number],
      );
      assert.equal(pool.rows.length, row.total);
      assert.deepEqual(
        pool.rows.map((q) => q.slot),
        Array.from({ length: Number(row.total) }, (_, i) => i),
      );
    }
    const exam = await query(db, randomQuestionSql(false));
    assert.equal(exam.rows.length, rows.filter((row) => Number(row.total) > 0).length);
  }
  await check();
  await db.prepare('UPDATE questions SET active=0 WHERE id=?').bind(originals[0].id).run();
  await check();
  await db.prepare('UPDATE questions SET active=0 WHERE id=?').bind(originals[35].id).run();
  await check();
  await upsertQuestions(db, [originals[0], originals[35]]);
  await check();
  await upsertQuestions(db, [{ ...originals[7], number: 2 }]);
  await check();
  await upsertQuestions(db, [{ ...originals[7], number: 2 }]); // Retry must not add slots.
  await check();
  await db.prepare('DELETE FROM questions WHERE id=?').bind(originals[14].id).run();
  await check();
  await Promise.all([
    upsertQuestions(db, [question(1), question(2)]),
    upsertQuestions(db, [question(1), question(2)]),
  ]);
  await check();
  const inactive = originals[21];
  await db.prepare('UPDATE questions SET active=0 WHERE id=?').bind(inactive.id).run();
  await upsertQuestions(db, [{ ...inactive, number: 7 }]);
  await check();
});

test('10,000 two-KB sources use indexed reads instead of scanning the bank', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const { db } = runtime;
  const lead = String.raw`Cho $x+1=2$. Tìm $x$. \loigiai{Suy ra $x=1$.}`;
  const source = lead + ' '.repeat(2048 - new TextEncoder().encode(lead).length);
  const started = performance.now();
  for (let i = 0; i < 10_000; i += 100)
    await upsertQuestions(
      db,
      Array.from({ length: 100 }, (_, j) => ({
        ...question(((i + j) % 7) + 1),
        statementRaw: source,
        raw: source,
      })),
    );
  const elapsed = performance.now() - started;
  const random = await query(db, randomQuestionSql(true), [3]);
  const exam = await query(db, randomQuestionSql(false));
  assert.equal(random.rows.length, 1);
  assert.equal(exam.rows.length, 7);
  assert(random.meta.rows_read < 100, `Random lookup read ${random.meta.rows_read} rows`);
  assert(exam.meta.rows_read < 100, `Exam lookup read ${exam.meta.rows_read} rows`);
  const legacy = await query(
    db,
    'SELECT id FROM questions WHERE active=1 AND number=? ORDER BY random() LIMIT 1',
    [3],
  );
  assert(legacy.meta.rows_read > 1000);
  const report = {
    environment: 'local workerd/D1; synthetic sources, not hosted latency',
    questions: 10_000,
    sourceBytesPerQuestion: new TextEncoder().encode(source).length,
    sourceBytes: 10_000 * 2048,
    localDatabaseBytes: exam.meta.size_after,
    randomRowsRead: random.meta.rows_read,
    examRowsRead: exam.meta.rows_read,
    previousRandomRowsRead: legacy.meta.rows_read,
    localImportMilliseconds: Math.round(elapsed),
  };
  await mkdir('.data', { recursive: true });
  await writeFile('.data/d1-capacity-check.json', JSON.stringify(report, null, 2) + '\n');
  t.diagnostic(JSON.stringify(report));
});

test('daily cleanup removes expired sessions/rate windows and logins older than 30 days', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const { db } = runtime;
  const now = Date.now();
  await db.batch([
    db.prepare('INSERT INTO access_codes(code) VALUES(?)').bind('CLEANUP1'),
    db
      .prepare('INSERT INTO sessions(token_hash,role,access_code,expires_at) VALUES(?,?,?,?)')
      .bind('expired', 'student', 'CLEANUP1', now - 1),
    db
      .prepare('INSERT INTO sessions(token_hash,role,access_code,expires_at) VALUES(?,?,?,?)')
      .bind('current', 'student', 'CLEANUP1', now + 60_000),
    db
      .prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,?,?)')
      .bind('expired', 1, now - 1),
    db
      .prepare(
        'INSERT INTO student_logins(id,student_name,student_class,access_code,login_time) VALUES(?,?,?,?,?)',
      )
      .bind('old', 'A', '9A', 'CLEANUP1', now - 31 * 24 * 60 * 60 * 1000),
    db
      .prepare(
        'INSERT INTO student_logins(id,student_name,student_class,access_code,login_time) VALUES(?,?,?,?,?)',
      )
      .bind('new', 'A', '9A', 'CLEANUP1', now),
  ]);
  await worker.scheduled({}, { DB: db, ASSETS: { fetch: async () => new Response() } });
  assert.deepEqual((await query(db, 'SELECT token_hash FROM sessions')).rows, [
    { token_hash: 'current' },
  ]);
  assert.deepEqual((await query(db, 'SELECT id FROM student_logins')).rows, [{ id: 'new' }]);
  assert.equal((await query(db, 'SELECT key FROM rate_limits')).rows.length, 0);
});

test('login throttling persists across requests and untrusted origins cannot write', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  for (let i = 0; i < 11; i++) {
    const response = await fetch(new URL('/api/auth/teacher', runtime.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.test', password: 'invalid-password' }),
    });
    assert.equal(response.status, i < 10 ? 401 : 429);
    await response.arrayBuffer();
  }
  const response = await fetch(new URL('/api/questions', runtime.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://another-site.example' },
    body: '{}',
  });
  assert.equal(response.status, 403);
});
