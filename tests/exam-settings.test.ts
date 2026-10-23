import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime';
import { createTeacher } from '../server/auth';
import { upsertQuestions } from '../server/app';
import { generateExam, matchExamCandidates } from '../server/exam';
import { validExam } from '../src/utils/exam';
import { emptyExamSlots } from '../shared/exam';
import { defaultStudentSettings } from '../shared/content';

test('exam matching reassigns overlaps, rejects impossible pools and ignores source numbering', () => {
  assert.deepEqual(matchExamCandidates([['a', 'b'], ['a']]), ['b', 'a']);
  assert.equal(matchExamCandidates([['a'], ['a']]), null);
  const questions = Array.from({ length: 7 }, (_, i) => ({
    id: `${i}`,
    number: 1,
    statementRaw: 'Đề',
    solutionRaw: 'Đáp án',
  }));
  assert(validExam({ questions, endAt: null, showAnswers: false, createdAt: Date.now() }));
  assert(
    !validExam({
      questions: [...questions.slice(0, 6), questions[0]],
      endAt: null,
      showAnswers: false,
      createdAt: Date.now(),
    }),
  );
});

test('topic-based exam configuration: permissions, versions, unique draws, publication and preservation', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  await createTeacher(db, 'exam@example.test', 'exam-fixture-password');
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
    await req('/auth/teacher', { email: 'exam@example.test', password: 'exam-fixture-password' })
  ).cookie;
  await req('/access-codes', { code: 'EXAMTEST' }, admin);
  const student = (
    await req('/auth/student', {
      studentName: 'Người học',
      studentClass: '9A',
      accessCode: 'EXAMTEST',
    })
  ).cookie;
  assert.equal((await req('/admin/exam-settings')).status, 401);
  assert.equal((await req('/admin/exam-settings', undefined, student)).status, 403);
  assert.equal((await req('/admin/exam-settings', { settings: {} }, student)).status, 403);
  assert.equal((await req('/exam')).status, 401);
  const initial = await req('/admin/exam-settings', undefined, admin);
  assert.deepEqual(initial.data.settings.slots, emptyExamSlots());
  assert.equal((await req('/exam', undefined, student)).status, 422);
  const topics = Array.from({ length: 4 }, () => crypto.randomUUID());
  for (const [i, id] of topics.entries())
    await db
      .prepare('INSERT INTO topics(id,title,published) VALUES(?,?,?)')
      .bind(id, `Chuyên đề ${i}`, i === 3 ? 0 : 1)
      .run();
  const questions = Array.from({ length: 8 }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Nguồn ${i + 12}`,
    number: i === 0 ? 85 : 1,
    sourceType: 'tex',
    statementRaw: `Nguồn $${i}+1$.`,
    solutionRaw: 'Đáp án nguyên vẹn.',
    raw: 'Bản gốc',
    latexPreamble: String.raw`\def\R{3}`,
    published: i !== 7,
    topicIds: i === 0 ? [topics[0], topics[1]] : [topics[0]],
  }));
  await upsertQuestions(db, questions);
  const sourceBefore = (await db.query('SELECT * FROM questions ORDER BY id')).rows;
  let settings = {
    version: 1,
    slots: emptyExamSlots().map((slot, i) => ({
      ...slot,
      description: `Mô tả ${i + 1}`,
      topicIds: [i === 1 ? topics[1] : topics[0]],
    })),
  };
  assert.equal(
    (
      await req(
        '/admin/exam-settings',
        { settings: { ...settings, slots: settings.slots.slice(1) } },
        admin,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await req(
        '/admin/exam-settings',
        {
          settings: {
            ...settings,
            slots: settings.slots.map((s) => ({ ...s, topicIds: [crypto.randomUUID()] })),
          },
        },
        admin,
      )
    ).status,
    409,
  );
  const saved = await req('/admin/exam-settings', { settings }, admin);
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.data.counts, [7, 1, 7, 7, 7, 7, 7]);
  assert.equal((await req('/admin/exam-settings', { settings }, admin)).status, 409);
  settings = saved.data.settings;
  for (let i = 0; i < 6; i++) {
    const exam = await req('/exam', undefined, student);
    assert.equal(exam.status, 200);
    assert.equal(new Set(exam.data.items.map((q: any) => q.id)).size, 7);
    assert.equal(exam.data.items[1].id, questions[0].id);
    assert(!exam.data.items.some((q: any) => q.id === questions[7].id));
    assert(
      exam.data.items.every(
        (q: any) =>
          q.number === 1 &&
          q.raw === 'Bản gốc' &&
          q.solutionRaw === 'Đáp án nguyên vẹn.' &&
          q.latexPreamble === String.raw`\def\R{3}`,
      ),
    );
    assert.deepEqual(
      exam.data.items.map((q: any) => q.examDescription),
      settings.slots.map((slot) => slot.description),
    );
  }
  assert.deepEqual((await db.query('SELECT * FROM questions ORDER BY id')).rows, sourceBefore);
  // Drawing from selected topics must not scan unrelated TeX sources in a large bank.
  for (let i = 0; i < 1000; i += 100)
    await upsertQuestions(
      db,
      Array.from({ length: 100 }, () => ({
        ...questions[0],
        id: crypto.randomUUID(),
        topicIds: [],
      })),
    );
  let rowsRead = 0;
  const measured = await generateExam({
    ...db,
    batch: async (statements: any) => {
      const results = await db.batch(statements);
      rowsRead += results.reduce((sum, result) => sum + result.meta.rows_read, 0);
      return results as any;
    },
  });
  assert.equal(measured.length, 7);
  assert(rowsRead < 250, `Topic-based exam read ${rowsRead} rows with 1000 unrelated sources.`);
  t.diagnostic(
    `Topic-based exam draw/source reads: ${rowsRead} rows, including 1000 unrelated sources.`,
  );
  // Same source can link several selected topics without being counted or drawn twice.
  settings.slots[0].topicIds = [topics[0], topics[1]];
  const union = await req('/admin/exam-settings', { settings }, admin);
  assert.equal(union.data.counts[0], 7);
  settings = union.data.settings;
  // A seven-slot blueprint with only six distinct eligible sources must never return a partial/repeated exam.
  await req('/questions/classify', { ids: [questions[6].id], published: false }, admin);
  assert.equal((await req('/exam', undefined, student)).status, 422);
  await req('/questions/classify', { ids: [questions[6].id], published: true }, admin);
  settings.slots[6].topicIds = [topics[3]];
  const hidden = await req('/admin/exam-settings', { settings }, admin);
  settings = hidden.data.settings;
  await db
    .prepare('INSERT INTO question_topics(question_id,topic_id) VALUES(?,?)')
    .bind(questions[0].id, topics[3])
    .run();
  assert.equal((await req('/exam', undefined, student)).status, 422);
  settings.slots[6].topicIds = [topics[2]]; // published but empty
  settings = (await req('/admin/exam-settings', { settings }, admin)).data.settings;
  const empty = await req('/exam', undefined, student);
  assert.equal(empty.status, 422);
  assert.match(empty.data.error, /Câu 7/);
  // Removal of the old tab preserves custom labels, order and content, even if it was the only visible tab.
  const legacy = {
    ...defaultStudentSettings,
    heroTitle: 'Nội dung riêng',
    tabs: [
      { key: 'practice', label: 'Ôn theo câu cũ', visible: true, description: '' },
      ...defaultStudentSettings.tabs
        .slice()
        .reverse()
        .map((tab) => ({ ...tab, visible: false, label: 'Riêng ' + tab.label })),
    ],
  };
  await db
    .prepare('UPDATE student_settings SET content=? WHERE id=1')
    .bind(JSON.stringify(legacy))
    .run();
  const content = (await req('/student-content', undefined, student)).data.settings;
  assert.equal(content.tabs.length, 3);
  assert.equal(content.tabs[0].key, 'guide');
  assert(content.tabs[0].visible);
  assert.equal(content.tabs[0].label, 'Riêng Góc học tập');
  assert.equal(content.heroTitle, 'Nội dung riêng');
});
