import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceEnvironment, questionEnvironment } from '../shared/questionEnvironment';
import { parseTexText } from '../shared/texParser';
import { scanQuestions, type ClassificationOutcome } from '../src/services/autoClassify';
import { runAutoImport } from '../src/services/autoImport';

test('exercise environments survive parsing; comments, declarations and nested bt inside ex cannot masquerade as bt', () => {
  const source = String.raw`% \begin{bt}not an exercise\end{bt}
\newcommand{\fake}{\begin{bt}not an exercise\end{bt}}
\begin{document}
\begin {bt}[Câu 20]Tự luận $x+1=3$.\loigiai{$x=2$.}\end {bt}
\begin{ex}Trắc nghiệm. \begin{bt}Nằm trong ex\end{bt}\loigiai{Đáp án.}\end{ex}
\begin{vd}Ví dụ.\end{vd}
\end{document}`;
  const parsed = parseTexText(source);
  assert.deepEqual(
    parsed.map((q) => q.exerciseEnvironment),
    ['bt', 'ex', 'vd'],
  );
  assert.deepEqual(parsed.map(questionEnvironment), ['bt', 'ex', 'vd']);
  assert.equal(sourceEnvironment(source), 'bt');
  assert.equal(questionEnvironment({ ...parsed[1], exerciseEnvironment: 'bt' }), 'ex');
  assert.equal(questionEnvironment({ ...parsed[0], sourceType: 'word' }), null);
  assert.equal(questionEnvironment(parseTexText('Câu 1. Bài không có môi trường.')[0]), null);
  assert.equal(sourceEnvironment(String.raw`\def\fake{\begin{bt}unclosed`), null);
});

test('AI scans send only bt statements and automatic imports neither send nor save ex/other sources', async () => {
  const topicId = crypto.randomUUID();
  const questions =
    parseTexText(String.raw`\begin{ex}Không gửi AI.\choice{1}{2}{3}{4}\loigiai{Đáp án riêng.}\end{ex}
\begin{bt}Bài tự luận $x+1=3$.\loigiai{$x=2$.}\end{bt}
\begin{vd}Ví dụ không gửi AI.\end{vd}`);
  const sent: string[] = [],
    applied: string[] = [];
  const outcomes: ClassificationOutcome[] = [];
  const original = structuredClone(questions);
  const suggest = async (batch: typeof questions) => {
    sent.push(...batch.map((q) => q.id));
    return batch.map((q) => ({ id: q.id, topicIds: [topicId], reason: 'Phù hợp.' }));
  };
  await scanQuestions(questions, {
    signal: new AbortController().signal,
    suggest,
    apply: (q) => {
      applied.push(q.id);
    },
    onOutcome: (outcome) => outcomes.push(outcome),
  });
  assert.deepEqual(sent, [questions[1].id]);
  assert.deepEqual(applied, sent);
  assert.equal(outcomes.filter((outcome) => outcome.state === 'skipped').length, 2);
  sent.length = 0;
  const saved: string[] = [];
  const imported = await runAutoImport(questions, {
    signal: new AbortController().signal,
    suggest,
    topics: [
      {
        id: topicId,
        title: 'Lập phương trình',
        category: 'Đại số',
        description: 'Bài toán phương trình.',
        icon: 'equation',
        color: 'blue',
        published: false,
        position: 0,
        questionCount: 0,
        version: 1,
      },
    ],
    published: false,
    onQuestion: () => {},
    onSaved: () => {},
    onOutcome: () => {},
    save: async (batch) => {
      saved.push(...batch.map((q) => q.id));
    },
  });
  assert.deepEqual(sent, [questions[1].id]);
  assert.deepEqual(saved, sent);
  assert.equal(imported.results.filter((result) => result.state === 'skipped').length, 2);
  assert.equal(imported.results.filter((result) => result.state === 'needs-review').length, 0);
  assert.deepEqual(questions, original);
});
