import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime';
import { upsertQuestions } from '../server/question-storage';
import {
  buildTopicTexArchive,
  parseTopicTexArchive,
  topicTexFileName,
  questionSourceRevision,
  isTopicTexArchive,
  type TopicRestoreItem,
} from '../shared/topicTexArchive';
import { restoreTopicTex } from '../server/topic-tex-restore';
import { parseTexText } from '../shared/texParser';
import type { Question } from '../src/types';
import type { Statement } from '../server/database';
const drawing = String.raw`\begin{tikzpicture}[scale=0.5]
  % preserve exact drawing
  \draw (2.5,0)--(0,1);
\end{tikzpicture}`;
const make = (topicId: string, i: number): Question => ({
  ...parseTexText(
    `\\begin{bt}Tính $\\frac{${i + 1}}{2}$.\\loigiai{Đáp án $${i + 11}$.}\\end{bt}`,
  )[0],
  topicIds: [topicId],
  published: i % 2 === 0,
  latexPreamble: String.raw`\def\R{2.5}`,
});
const items = (qs: Question[]): TopicRestoreItem[] =>
  qs.map((q) => ({
    id: q.topicRestore!.questionId,
    topicId: q.topicRestore!.topicId,
    revision: q.topicRestore!.revision,
    raw: q.raw!,
    latexPreamble: q.latexPreamble || '',
  }));

test('all exported questions, solutions and per-question TikZ declarations survive round-trip parsing', async () => {
  const topic = { id: crypto.randomUUID(), title: 'Hàm số & đồ thị / Toán 9' };
  const qs = [
    make(topic.id, 0),
    {
      ...make(topic.id, 1),
      latexPreamble: String.raw`\def\R{4}`,
      statementRaw: 'Câu 99 là nhãn trong nội dung. ' + drawing,
    },
  ];
  const text = await buildTopicTexArchive(topic, qs);
  assert(text.includes(drawing));
  assert(text.includes('\\begingroup\n\\def\\R{2.5}'));
  assert(!topicTexFileName(topic.title).includes('/'));
  assert(topicTexFileName(topic.title).endsWith('.deltascript.tex'));
  const parsed = parseTopicTexArchive(text);
  assert.equal(parsed.length, 2);
  for (let i = 0; i < qs.length; i++) {
    assert.equal(parsed[i].statementRaw, qs[i].statementRaw);
    assert.equal(parsed[i].solutionRaw, qs[i].solutionRaw);
    assert.equal(parsed[i].latexPreamble, qs[i].latexPreamble);
    assert.equal(parsed[i].topicRestore!.questionId, qs[i].id);
    assert.equal(parsed[i].topicRestore!.revision, await questionSourceRevision(qs[i]));
  }
  assert(isTopicTexArchive('', topicTexFileName(topic.title)));
  assert.throws(
    () => parseTopicTexArchive(text.replace(/^% DELTASCRIPT-QUESTION:.*\n/m, '')),
    /định danh/,
  );
  assert.throws(
    () => parseTopicTexArchive(text.replace(/^% DELTASCRIPT-EXPORT:.*\n/m, '')),
    /DELTASCRIPT-EXPORT/,
  );
  assert.equal(parseTopicTexArchive(text.replace(/% DELTASCRIPT/g, '%DELTASCRIPT')).length, 2);
});

test('importing edited topic files updates existing IDs once and preserves labels, links and publication', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  const topic = { id: crypto.randomUUID(), title: 'Chuyên đề tải xuống' },
    other = crypto.randomUUID();
  await db
    .prepare("INSERT INTO topics(id,title,published) VALUES(?,?,1),(?,'Khác',1)")
    .bind(topic.id, topic.title, other)
    .run();
  const qs = [
    { ...make(topic.id, 0), topicIds: [topic.id, other] },
    make(topic.id, 1),
    make(other, 2),
  ];
  await upsertQuestions(db, qs);
  const before = (await db.query('SELECT * FROM questions ORDER BY id')).rows;
  const text = await buildTopicTexArchive(topic, qs.slice(0, 2));
  const parsed = parseTopicTexArchive(text.replace(/\\frac/g, '\\dfrac'));
  assert.deepEqual(await restoreTopicTex(db, { items: items(parsed) }), {
    updated: 2,
    unchanged: 0,
  });
  const after = (await db.query('SELECT * FROM questions ORDER BY id')).rows;
  assert.equal(after.length, 3);
  for (const row of after) {
    const old = before.find((q) => q.id === row.id)!;
    assert.equal(row.published, old.published);
    assert.equal(row.label, old.label);
    assert.equal(row.number, old.number);
    if (row.id === qs[2].id) assert.deepEqual(row, old);
    else assert(String(row.statement_raw).includes('\\dfrac'));
  }
  assert.equal(
    (await db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [other])).rows
      .length,
    2,
  );
  assert.equal((await db.query('SELECT snapshot FROM question_revisions')).rows.length, 2);
  assert.deepEqual(await restoreTopicTex(db, { items: items(parsed) }), {
    updated: 0,
    unchanged: 2,
  });
  assert.equal((await db.query('SELECT id FROM question_revisions')).rows.length, 2);
});

test('stale, deleted, moved or stripped-answer imports cannot overwrite the bank', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  const topic = { id: crypto.randomUUID(), title: 'An toàn nguồn' };
  await db.prepare('INSERT INTO topics(id,title) VALUES(?,?)').bind(topic.id, topic.title).run();
  const q = make(topic.id, 0);
  await upsertQuestions(db, [q]);
  const text = await buildTopicTexArchive(topic, [q]);
  const change = items(parseTopicTexArchive(text.replace(/\\frac/g, '\\dfrac')));
  await db
    .prepare("UPDATE questions SET statement_raw='Chủ trang vừa sửa' WHERE id=?")
    .bind(q.id)
    .run();
  await assert.rejects(
    () => restoreTopicTex(db, { items: change }),
    (e: any) => e.status === 409,
  );
  assert.equal((await db.query('SELECT id FROM question_revisions')).rows.length, 0);
  await upsertQuestions(db, [q]);
  const blank = items(parseTopicTexArchive(text.replace(q.solutionRaw, '')));
  await assert.rejects(
    () => restoreTopicTex(db, { items: blank }),
    (e: any) => e.status === 422,
  );
  await db.prepare('DELETE FROM question_topics WHERE question_id=?').bind(q.id).run();
  await assert.rejects(
    () => restoreTopicTex(db, { items: change }),
    (e: any) => e.status === 409,
  );
  await upsertQuestions(db, [q]);
  await db.prepare('UPDATE questions SET active=0 WHERE id=?').bind(q.id).run();
  await assert.rejects(
    () => restoreTopicTex(db, { items: change }),
    (e: any) => e.status === 409,
  );
  assert.equal((await db.query('SELECT active FROM questions')).rows[0].active, 0);
});

test('a concurrent edit between reading and writing rolls back the entire restoration batch', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db;
  const topic = { id: crypto.randomUUID(), title: 'Giao dịch' };
  await db.prepare('INSERT INTO topics(id,title) VALUES(?,?)').bind(topic.id, topic.title).run();
  const qs = [make(topic.id, 0), make(topic.id, 1)];
  await upsertQuestions(db, qs);
  const requests = items(
    parseTopicTexArchive((await buildTopicTexArchive(topic, qs)).replace(/\\frac/g, '\\dfrac')),
  );
  const racing = {
    ...db,
    batch: async <T = unknown>(statements: Statement[]) => {
      await db
        .prepare("UPDATE questions SET solution_raw='Thay đổi mới' WHERE id=?")
        .bind(qs[1].id)
        .run();
      return db.batch<T>(statements);
    },
  };
  await assert.rejects(
    () => restoreTopicTex(racing, { items: requests }),
    (e: any) => e.status === 409,
  );
  assert.equal((await db.query('SELECT id FROM question_revisions')).rows.length, 0);
  assert.equal(
    (await db.prepare('SELECT statement_raw FROM questions WHERE id=?').bind(qs[0].id).first())!
      .statement_raw,
    qs[0].statementRaw,
  );
});

test('restoration is restricted to administrators and bounded batches', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const response = await fetch(runtime.url.origin + '/api/admin/topics/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 401);
  await assert.rejects(() =>
    restoreTopicTex(runtime.db, { items: Array.from({ length: 11 }, () => ({})) }),
  );
});
