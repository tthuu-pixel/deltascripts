import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTexText } from '../shared/texParser';
import {
  canProcessEssay,
  hasAnswerChoices,
  normalizeEssayQuestion,
  parseRepairableTex,
  lockTex,
} from '../shared/essayNormalization';
import { environmentRanges } from '../shared/texSyntax';
import { createRuntime } from './runtime';
import { adminAiRoute } from '../server/admin-ai';
import { repairQuestions, validateProsePreserved } from '../server/ai-repair';
import { upsertQuestions } from '../server/app';
import { saveRepairedQuestion } from '../server/question-repair-save';
import type { Question } from '../src/types';

const drawing = String.raw`\begin{tikzpicture}[scale=0.6,declare function={r=2.5;}]
  % keep this exact comment and spacing
  \draw (2.5,0)--(0,1); \node at (0,0) {$\frac{1}{2}$};
\end{tikzpicture}`;
const pictures = (s: string) =>
  environmentRanges(s, ['tikzpicture']).map((r) => s.slice(r.start, r.end));
test('essay conversion removes nested immini/options, preserves scoped declarations and every drawing byte, and is idempotent', () => {
  const q = parseTexText(
    String.raw`\begin{ex}[Trích đề cũ]
\immini[thm]{Tính $\frac{1}{2}$.\immini{Nội dung trong.}{Hình nhỏ.}}{\def\R{2.5}
` +
      drawing +
      String.raw`}
\loigiai{Giữ lời giải $\frac{1}{2}$.}
\end{ex}`,
  )[0];
  const next = normalizeEssayQuestion(q);
  assert(canProcessEssay(q));
  assert.equal(next.exerciseEnvironment, 'bt');
  assert(next.raw!.startsWith('\\begin{bt}'));
  assert(!next.statementRaw.includes('\\immini'));
  assert(next.statementRaw.includes('Nội dung trong.'));
  assert(next.statementRaw.includes('Hình nhỏ.'));
  assert(next.statementRaw.includes('\\def\\R{2.5}'));
  assert.deepEqual(pictures(next.raw!), pictures(q.raw!));
  assert(next.statementRaw.includes('\\dfrac{1}{2}'));
  assert.equal(next.originalRaw, q.raw);
  assert.equal(normalizeEssayQuestion(next).raw, next.raw);
  const locked = lockTex(next.statementRaw);
  assert(!locked.text.includes('\\draw'));
  assert.throws(() => locked.restore(locked.text.replace(/DSLOCK\w+END/, '')));
  assert.equal(locked.restore(locked.text), next.statementRaw);
});
test('real choices and typo choide remain excluded; comments, declarations and drawing labels do not count as answer commands', () => {
  for (const command of ['choice', 'choiceTF', 'choiceTFt', 'choide']) {
    const q = parseTexText(`\\begin{ex}Chọn.\\${command}{A}{B}{C}{D}\\end{ex}`)[0];
    assert(hasAnswerChoices(q.statementRaw));
    assert(!canProcessEssay(q));
    assert.equal(normalizeEssayQuestion(q).exerciseEnvironment, 'ex');
  }
  const q = parseTexText(String.raw`\begin{ex}% \choice in comment
\newcommand{\fake}{\choice{1}{2}{3}{4}}
Tự luận.\end{ex}`)[0];
  assert(canProcessEssay(q));
  assert(!canProcessEssay({ ...q, sourceType: 'word' }));
});

test('AI repairs syntax and wrong solution, retries damaged figure tokens, saves source/topics and backs up atomically', async (t) => {
  let calls = 0;
  const topicId = crypto.randomUUID();
  let qid = '';
  const fetchMock: typeof fetch = async (_url, init) => {
    const input = JSON.parse(JSON.parse(String(init?.body)).messages.at(-1).content);
    calls++;
    assert(!JSON.stringify(input).includes('\\draw'));
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: input.questions.map((q: any) => ({
                id: q.id,
                statementRaw:
                  calls === 1 ? 'Tính $2+2$.' : q.statement.replace('Tính $2+2', 'Tính $2+2$'),
                solutionRaw: 'Ta có $2+2=4$. Vậy đáp án là $4$.',
                topicIds: [topicId],
                reason: 'Sửa dấu công thức và kết quả.',
              })),
            }),
          },
        },
      ],
    });
  };
  const runtime = await createRuntime({
    aiSettingsKey: 'repair-fixture-encryption-secret-32-characters',
    fetchGemini: fetchMock,
  });
  t.after(() => runtime.close());
  await runtime.db
    .prepare(
      "INSERT INTO topics(id,title,description) VALUES(?,'Tính toán','Các phép tính với số tự nhiên.')",
    )
    .bind(topicId)
    .run();
  await adminAiRoute(
    runtime.db,
    '/api/admin/ai/settings',
    'POST',
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-flash',
      apiKey: 'test-fixture-key',
      version: 0,
    },
    { aiSettingsKey: 'repair-fixture-encryption-secret-32-characters', fetchGemini: fetchMock },
  );
  const q: Question = {
    id: crypto.randomUUID(),
    label: 'Không đổi nhãn',
    number: 4,
    sourceType: 'tex',
    exerciseEnvironment: 'ex',
    raw: '\\begin{ex}Nguồn ban đầu\\end{ex}',
    statementRaw: 'Tính $2+2\n' + drawing,
    solutionRaw: '$2+2=5$.',
    published: false,
    topicIds: [],
  };
  qid = q.id;
  await upsertQuestions(runtime.db, [q]);
  const result = (await repairQuestions(
    runtime.db,
    { save: true, questions: [{ id: qid }] },
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-flash',
      apiKey: 'fixture',
    },
    { fetchGemini: fetchMock },
  )) as { items: any[] };
  assert.equal(calls, 2);
  assert.equal(result.items[0].saved, true);
  assert.equal(result.items[0].pending, undefined);
  const saved = await runtime.db.prepare('SELECT * FROM questions WHERE id=?').bind(qid).first();
  assert(saved);
  assert.equal(saved.published, 0);
  assert.equal(saved.number, 4);
  assert.equal(saved.label, q.label);
  assert(String(saved.solution_raw).includes('2+2=4'));
  assert(String(saved.raw).startsWith('\\begin{bt}'));
  assert.deepEqual(pictures(String(saved.raw)), [drawing]);
  const history = await runtime.db
    .prepare('SELECT * FROM question_revisions WHERE question_id=?')
    .bind(qid)
    .all();
  assert.equal(history.results.length, 1);
  assert.equal(JSON.parse(String(history.results[0].snapshot)).raw, q.raw);
  assert.equal(
    (await runtime.db
      .prepare('SELECT topic_id FROM question_topics WHERE question_id=?')
      .bind(qid)
      .first())!.topic_id,
    topicId,
  );
  // A stale result must not overwrite a newer edit or its topic links.
  const stale = {
    ...q,
    raw: String(saved.raw),
    statementRaw: String(saved.statement_raw),
    solutionRaw: String(saved.solution_raw),
    latexPreamble: '',
    topicIds: [topicId],
  };
  await runtime.db
    .prepare("UPDATE questions SET statement_raw='Chủ trang vừa sửa' WHERE id=?")
    .bind(qid)
    .run();
  await assert.rejects(
    () => saveRepairedQuestion(runtime.db, stale, { ...stale, statementRaw: 'Ghi đè' }, 'test'),
    /vừa thay đổi/,
  );
  assert.equal(
    (await runtime.db.prepare('SELECT count(*) n FROM question_revisions').first())!.n,
    1,
  );
  assert.equal(
    (await runtime.db.prepare('SELECT statement_raw FROM questions WHERE id=?').bind(qid).first())!
      .statement_raw,
    'Chủ trang vừa sửa',
  );
});

test('unrepairable AI output stays pending without changing source or inventing a topic', async (t) => {
  let calls = 0;
  const fetchMock: typeof fetch = async () => {
    calls++;
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  id: qid,
                  statementRaw: 'AI đoán một đề khác',
                  solutionRaw: 'Đáp án bịa',
                  topicIds: ['invented'],
                  needsRetry: false,
                },
              ],
            }),
          },
        },
      ],
    });
  };
  const runtime = await createRuntime({
    aiSettingsKey: 'repair-pending-encryption-secret-32-characters',
    fetchGemini: fetchMock,
  });
  t.after(() => runtime.close());
  const qid = crypto.randomUUID(),
    topicId = crypto.randomUUID();
  await runtime.db
    .prepare("INSERT INTO topics(id,title,description) VALUES(?,'Đại số','Giải phương trình.')")
    .bind(topicId)
    .run();
  await adminAiRoute(
    runtime.db,
    '/api/admin/ai/settings',
    'POST',
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-flash',
      apiKey: 'fixture',
      version: 0,
    },
    { aiSettingsKey: 'repair-pending-encryption-secret-32-characters', fetchGemini: fetchMock },
  );
  const q = parseTexText('\\begin{bt}Đề thiếu dữ kiện.\\end{bt}')[0];
  q.id = qid;
  await upsertQuestions(runtime.db, [q]);
  const before = (await runtime.db.query('SELECT * FROM questions')).rows;
  const response = (await repairQuestions(
    runtime.db,
    { save: true, questions: [{ id: qid }] },
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-flash',
      apiKey: 'fixture',
    },
    { fetchGemini: fetchMock },
  )) as { items: any[] };
  assert.equal(calls, 3);
  assert.equal(response.items[0].pending, true);
  assert.deepEqual((await runtime.db.query('SELECT * FROM questions')).rows, before);
  assert.equal(
    (await runtime.db.prepare('SELECT count(*) n FROM question_revisions').first())!.n,
    0,
  );
});

test('a missing outer closing tag is recovered with the exact first source retained', () => {
  const raw = String.raw`\begin{bt}Bài đầu.\end{bt}
\begin{ex}Bài sau.\loigiai{Lời giải.}`;
  const parsed = parseRepairableTex(raw);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[1].originalRaw, String.raw`\begin{ex}Bài sau.\loigiai{Lời giải.}`);
  const next = normalizeEssayQuestion(parsed[1]);
  assert(next.raw!.startsWith('\\begin{bt}'));
  assert.equal(next.originalRaw, parsed[1].originalRaw);
});

test('valid-looking truncated statements and missing subparts are retried rather than saved', () => {
  assert.throws(() => validateProsePreserved('Nội dung. '.repeat(100), 'Một dòng thay thế'));
  assert.throws(() =>
    validateProsePreserved(String.raw`\item Ý một.\item Ý hai.`, String.raw`\item Ý một.`),
  );
  validateProsePreserved(
    String.raw`\item Tính $\frac{1}{2}$.`,
    String.raw`\item Tính $\dfrac{1}{2}$.`,
  );
});

test('an incomplete drawing stays an essay awaiting repair instead of being silently skipped', () => {
  const q = parseTexText(String.raw`\begin{bt}Tự luận.\end{bt}`)[0];
  q.statementRaw = String.raw`Tự luận.\begin{tikzpicture}\draw (0,0)--(1,1);`;
  assert.equal(canProcessEssay(q), true);
});
