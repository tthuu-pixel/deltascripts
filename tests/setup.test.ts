import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime.ts';
import { createTeacher, newToken, tokenHash, verifyPassword } from '../server/auth.ts';

test('first-teacher setup requires an operator link and atomically consumes it', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const { db } = runtime;
  const token = newToken();
  const password = 'setup-test-password-2026';
  const payload = { token, email: 'Owner@Example.test', password };
  async function request(route: string, body: unknown, origin = runtime.url.origin) {
    const response = await fetch(new URL(`/api/auth/setup${route}`, runtime.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(), headers: response.headers };
  }
  const issue = async (expiresAt: number) =>
    db.query(
      `INSERT INTO teacher_setup_links(id,token_hash,expires_at) VALUES(1,?,?)
    ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=NULL`,
      [await tokenHash(token), expiresAt],
    );
  await t.test('an empty DB alone never enables registration', async () => {
    assert.equal((await request('', payload)).status, 410);
    assert.equal((await request('/check', { token })).status, 410);
    assert.equal((await db.query('SELECT id FROM teachers')).rows.length, 0);
  });
  await t.test('expired, malformed and wrong credentials are rejected', async () => {
    await issue(Date.now() - 1);
    assert.equal((await request('', payload)).status, 410);
    await issue(Date.now() + 60_000);
    for (const invalid of ['', 'a'.repeat(64), { token }, token + 'x'])
      assert.equal((await request('/check', { token: invalid })).status, 410);
    assert.equal((await request('/check', { token })).status, 200);
    assert.equal((await request('/check', { token }, 'https://attacker.invalid')).status, 403);
    const row = (await db.query('SELECT * FROM teacher_setup_links')).rows[0];
    assert.equal(row.token_hash, await tokenHash(token));
    assert(!JSON.stringify(row).includes(token));
  });
  await t.test('invalid input does not consume the link or create a teacher', async () => {
    assert.equal((await request('', { ...payload, email: 'invalid' })).status, 400);
    assert.equal((await request('', { ...payload, password: 'short' })).status, 400);
    assert.equal((await request('', { ...payload, password: 'x'.repeat(257) })).status, 400);
    assert.equal((await db.query('SELECT used_at FROM teacher_setup_links')).rows[0].used_at, null);
    assert.equal((await db.query('SELECT id FROM teachers')).rows.length, 0);
  });
  await t.test(
    'only one concurrent request succeeds; cookie and password use existing auth',
    async () => {
      const submissions = await Promise.all([
        request('', payload),
        request('', { ...payload, email: 'other@example.test' }),
      ]);
      assert.deepEqual(submissions.map((s) => s.status).sort(), [200, 410]);
      const success = submissions.find((s) => s.status === 200)!;
      assert.match(success.headers.get('set-cookie') || '', /HttpOnly/);
      assert.match(success.headers.get('set-cookie') || '', /SameSite=Lax/);
      const cookie = success.headers.get('set-cookie')!.split(';')[0];
      const me = await fetch(new URL('/api/auth/me', runtime.url), { headers: { Cookie: cookie } });
      assert.equal(me.status, 200);
      assert.equal(((await me.json()) as any).user.role, 'teacher');
      const teachers = (await db.query('SELECT email,password_hash FROM teachers')).rows;
      assert.equal(teachers.length, 1);
      assert.equal(String(teachers[0].email), String(teachers[0].email).toLowerCase());
      assert(await verifyPassword(password, String(teachers[0].password_hash)));
      assert(!String(teachers[0].password_hash).includes(password));
      assert((await db.query('SELECT used_at FROM teacher_setup_links')).rows[0].used_at);
      assert.equal((await db.query('SELECT count(*) AS n FROM sessions')).rows[0].n, 1);
      const login = await fetch(new URL('/api/auth/teacher', runtime.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: teachers[0].email, password }),
      });
      assert.equal(login.status, 200);
    },
  );
  await t.test('used links cannot create or reset any account', async () => {
    assert.equal((await request('/check', { token })).status, 410);
    assert.equal((await request('', { ...payload, password: password + '-changed' })).status, 410);
    // Even mistakenly reissuing an unused token cannot bypass an existing teacher.
    await issue(Date.now() + 60_000);
    assert.equal((await request('', payload)).status, 410);
    assert.equal((await db.query('SELECT count(*) AS n FROM teachers')).rows[0].n, 1);
  });
});

test('setup cannot change an existing teacher even with an unused valid link', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const token = newToken();
  await runtime.db.query(
    'INSERT INTO teacher_setup_links(id,token_hash,expires_at) VALUES(1,?,?)',
    [await tokenHash(token), Date.now() + 60_000],
  );
  await createTeacher(runtime.db, 'existing@example.test', 'existing-teacher-password');
  const response = await fetch(new URL('/api/auth/setup', runtime.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      email: 'existing@example.test',
      password: 'new-teacher-password',
    }),
  });
  assert.equal(response.status, 410);
  const teacher = (await runtime.db.query('SELECT password_hash FROM teachers')).rows[0];
  assert(await verifyPassword('existing-teacher-password', String(teacher.password_hash)));
});

test('setup link attempts are rate limited persistently', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  for (let i = 0; i < 21; i++) {
    const response = await fetch(new URL('/api/auth/setup/check', runtime.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(response.status, i < 20 ? 410 : 429);
    await response.text();
  }
});
