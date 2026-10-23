import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRuntime } from './runtime.ts';
import { createTeacher } from '../server/auth.ts';

const fixturePassword = 'test-only-password-2026';
const question = (number: number) => ({
  id: randomUUID(),
  label: `Câu ${number}`,
  number,
  sourceType: 'tex',
  statementRaw: `Tính $${number}+1$.`,
  solutionRaw: 'Đáp án $2$.',
  raw: 'original',
  latexPreamble: String.raw`\def\R{2.5}`,
});

test('Workers + D1: authenticated application workflow', async (t) => {
  let geminiPayload: any;
  const runtime = await createRuntime({
    fetchGemini: async (_url, init) => {
      geminiPayload = JSON.parse(String(init?.body));
      const similar = geminiPayload.contents.at(-1).parts[0].text.includes('Tạo một bài');
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: similar
                      ? String.raw`\begin{ex}New exercise $x+1$.\loigiai{A complete answer.}\end{ex}`
                      : 'Một gợi ý.',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    },
  });
  const { db } = runtime;
  await createTeacher(db, 'teacher@example.test', fixturePassword);
  const base = runtime.url.origin;
  t.after(() => runtime.close());
  async function request(
    route: string,
    body?: unknown,
    cookie = '',
    headers: Record<string, string> = {},
  ) {
    const res = await fetch(base + '/api' + route, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      data: (await res.json()) as any,
      cookie: res.headers.get('set-cookie')?.split(';')[0] || '',
      headers: res.headers,
    };
  }
  const teacher = await request('/auth/teacher', {
    email: 'teacher@example.test',
    password: fixturePassword,
  });
  assert.equal(teacher.status, 200);
  const teacherCookie = teacher.cookie;
  let studentCookie = '';
  const all = Array.from({ length: 7 }, (_, i) => question(i + 1));
  await t.test('healthy DB; no anonymous administrative reads or writes', async () => {
    assert.equal((await request('/health')).status, 200);
    assert.equal((await request('/questions')).status, 401);
    assert.equal((await request('/access-codes', { code: 'TEST0001' })).status, 401);
  });
  await t.test('server validates teacher credentials; session cookie is HttpOnly', async () => {
    assert.match(teacher.headers.get('set-cookie') || '', /HttpOnly/);
    assert.equal(
      (await request('/auth/teacher', { email: 'teacher@example.test', password: 'wrong' })).status,
      401,
    );
    assert.equal((await request('/auth/me', undefined, teacherCookie)).data.user.role, 'teacher');
    const stored = await db.query('SELECT password_hash FROM teachers');
    assert(!String(stored.rows[0].password_hash).includes(fixturePassword));
  });
  await t.test('cross-origin writes and non-JSON bodies are rejected', async () => {
    assert.equal(
      (
        await request('/access-codes', { code: 'TEST0001' }, teacherCookie, {
          Origin: 'https://attacker.invalid',
        })
      ).status,
      403,
    );
    const result = await fetch(base + '/api/access-codes', {
      method: 'POST',
      headers: { Cookie: teacherCookie, 'Content-Type': 'text/plain' },
      body: '{}',
    });
    assert.equal(result.status, 415);
  });
  await t.test('code validation, uniqueness and student login log', async () => {
    assert.equal((await request('/access-codes', { code: 'short' }, teacherCookie)).status, 400);
    assert.equal((await request('/access-codes', { code: 'TEST0001' }, teacherCookie)).status, 200);
    assert.equal((await request('/access-codes', { code: 'TEST0001' }, teacherCookie)).status, 409);
    assert.equal(
      (
        await request('/auth/student', {
          studentName: 'Học sinh',
          studentClass: '9A',
          accessCode: 'WRONG001',
        })
      ).status,
      401,
    );
    const login = await request('/auth/student', {
      studentName: 'Học sinh',
      studentClass: '9A',
      accessCode: 'test0001',
    });
    assert.equal(login.status, 200);
    studentCookie = login.cookie;
    assert.equal((await db.query('SELECT count(*) AS n FROM student_logins')).rows[0].n, 1);
  });
  await t.test('student cannot list access codes or modify questions', async () => {
    assert.equal((await request('/access-codes', undefined, studentCookie)).status, 403);
    assert.equal((await request('/questions', { questions: all }, studentCookie)).status, 403);
  });
  await t.test('partial exams rejected; save and retry keep stable IDs', async () => {
    assert.equal((await request('/questions', { questions: [all[0]] }, teacherCookie)).status, 200);
    const partial = await request('/exam', undefined, studentCookie);
    assert.equal(partial.status, 422);
    assert.match(partial.data.error, /1, 2, 3, 4, 5, 6, 7/);
    await request('/questions', { questions: all }, teacherCookie);
    await request('/questions', { questions: all }, teacherCookie);
    const list = await request('/questions', undefined, teacherCookie);
    assert.equal(list.data.items.length, 7);
    assert.equal(list.data.total, 7);
  });
  await t.test('exam positions use configured topics and preserve TeX sources', async () => {
    const topicIds = all.map(() => randomUUID());
    for (let i = 0; i < 7; i++) {
      await db
        .prepare('INSERT INTO topics(id,title,published) VALUES(?,?,1)')
        .bind(topicIds[i], `Chuyên đề ${i + 1}`)
        .run();
      await db
        .prepare('INSERT INTO question_topics(question_id,topic_id) VALUES(?,?)')
        .bind(all[i].id, topicIds[i])
        .run();
    }
    const settings = {
      version: 1,
      slots: all.map((_, i) => ({
        position: i + 1,
        description: `Vị trí ${i + 1}`,
        topicIds: [topicIds[i]],
      })),
    };
    assert.equal((await request('/admin/exam-settings', { settings }, teacherCookie)).status, 200);
    const exam = await request('/exam', undefined, studentCookie);
    assert.equal(exam.status, 200);
    assert.deepEqual(
      exam.data.items.map((q: any) => q.id),
      all.map((q) => q.id),
    );
    assert.equal(exam.data.items[2].raw, 'original');
    assert.equal(exam.data.items[2].latexPreamble, String.raw`\def\R{2.5}`);
    assert.equal(exam.data.items[2].examDescription, 'Vị trí 3');
    assert.equal(
      (await request('/questions/random?number=3', undefined, studentCookie)).status,
      404,
    );
  });
  await t.test(
    'AI gateway forwards history and parses similar exercises without exposing keys',
    async () => {
      const answer = await request(
        '/ai',
        {
          message: 'Next step',
          context: 'The question',
          history: [
            { role: 'user', content: 'First step' },
            { role: 'assistant', content: 'Try a substitution' },
          ],
        },
        studentCookie,
      );
      assert.equal(answer.status, 200);
      assert.equal(answer.data.reply, 'Một gợi ý.');
      assert(geminiPayload.contents.some((m: any) => m.parts[0].text === 'First step'));
      const similar = await request(
        '/ai/similar',
        { context: 'Original question', number: 3 },
        studentCookie,
      );
      assert.equal(similar.status, 200);
      assert.equal(similar.data.question.label, 'Bài tập tương tự');
      assert.match(similar.data.question.solutionRaw, /complete answer/);
      assert(!JSON.stringify(similar.data).includes('test-fixture-key'));
    },
  );
  await t.test('invalid batch fails atomically and SQL text stays data', async () => {
    const result = await request(
      '/questions',
      { questions: [question(1), { ...question(9), statementRaw: '' }] },
      teacherCookie,
    );
    assert.equal(result.status, 400);
    assert.equal((await request('/questions', undefined, teacherCookie)).data.total, 7);
    const special = { ...question(1), statementRaw: "'; DROP TABLE questions; --" };
    await request('/questions', { questions: [special] }, teacherCookie);
    assert.equal((await request('/questions', undefined, teacherCookie)).data.total, 8);
  });
  await t.test(
    'teacher list paginates and retired type filters do not split the bank',
    async () => {
      await request(
        '/questions',
        { questions: Array.from({ length: 25 }, () => question(2)) },
        teacherCookie,
      );
      const page = await request('/questions?page=1&pageSize=20', undefined, teacherCookie);
      assert.equal(page.data.items.length, 20);
      assert.equal(page.data.total, 33);
      const filtered = await request('/questions?number=3', undefined, teacherCookie);
      assert.equal(filtered.data.total, 33);
    },
  );
  await t.test('question soft deletion affects random/exam reads', async () => {
    await request('/questions/delete', { ids: [all[3].id] }, teacherCookie);
    assert.equal(
      (await request('/questions/random?number=4', undefined, studentCookie)).status,
      404,
    );
    assert.equal((await request('/exam', undefined, studentCookie)).status, 422);
  });
  await t.test(
    'D1 batch handles 100 questions below binding limits and rolls back database failures',
    async () => {
      const bulk = Array.from({ length: 100 }, () => question(4));
      assert.equal((await request('/questions', { questions: bulk }, teacherCookie)).status, 200);
      const before = (await db.query('SELECT count(*) AS n FROM questions')).rows[0].n;
      await assert.rejects(() =>
        db.batch([
          db.prepare('INSERT INTO access_codes(code) VALUES(?)').bind('ROLLBACK'),
          db
            .prepare(
              'INSERT INTO questions(id,label,number,source_type,statement_raw) VALUES(?,?,?,?,?)',
            )
            .bind(randomUUID(), 'invalid', 9, 'tex', 'invalid'),
        ]),
      );
      assert.equal(
        (await db.query('SELECT code FROM access_codes WHERE code=?', ['ROLLBACK'])).rows.length,
        0,
      );
      assert.equal((await db.query('SELECT count(*) AS n FROM questions')).rows[0].n, before);
    },
  );
  await t.test('revoking an access code revokes existing student sessions', async () => {
    await request('/access-codes/delete', { codes: ['TEST0001'] }, teacherCookie);
    assert.equal((await request('/auth/me', undefined, studentCookie)).status, 401);
    assert.equal(
      (
        await request('/auth/student', {
          studentName: 'A',
          studentClass: '9A',
          accessCode: 'TEST0001',
        })
      ).status,
      401,
    );
  });
  await t.test('password reset and logout revoke sessions', async () => {
    await createTeacher(db, 'teacher@example.test', fixturePassword + 'new');
    assert.equal((await request('/auth/me', undefined, teacherCookie)).status, 401);
    const login = await request('/auth/teacher', {
      email: 'teacher@example.test',
      password: fixturePassword + 'new',
    });
    await request('/auth/logout', {}, login.cookie);
    assert.equal((await request('/auth/me', undefined, login.cookie)).status, 401);
  });
});
