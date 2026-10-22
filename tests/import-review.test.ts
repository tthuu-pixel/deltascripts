import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuestion, inspectTex, restoreQuestionSource } from '../shared/importReview.ts';
import { parseTexText } from '../shared/texParser.ts';

test('import normalization preserves source, numbers, answers, executable TikZ and macros', () => {
  const drawing = String.raw`\begin{tikzpicture}\draw (2.5,0)--(1.2,3);\node at (0,0) {$\frac{1}{2}$};\end{tikzpicture}`;
  const macro = String.raw`\newcommand{\half}{\frac{1}{2}% technical
}`;
  const input = String.raw`\begin{bt}[1,0 điểm]%[9H4V1-4]
\textbf{(1,0 điểm)}${macro}
\immini{Tính $\frac{1}{2}\ge 0{,}5$. Giá $50\%$.}{${drawing}}
\loigiai{Giữ nguyên $\frac{4}{8}=\frac{1}{2}$.}\end{bt}`;
  const parsed = parseTexText(input)[0];
  const { question, report } = normalizeQuestion(parsed);
  assert.equal(question.raw, input);
  assert.match(question.statementRaw, /\\dfrac\{1\}\{2\}\\geq 0\{,\}5/);
  assert.match(question.statementRaw, /50\\%/);
  assert(question.statementRaw.includes(drawing));
  assert(question.statementRaw.includes(macro));
  assert.match(question.solutionRaw, /\\dfrac\{4\}\{8\}=\\dfrac\{1\}\{2\}/);
  assert.deepEqual(report.points, ['1,0 điểm']);
  assert.deepEqual(report.codes, ['9H4V1-4']);
  assert(!question.statementRaw.includes('[9H4V1-4]'));
  assert(!question.statementRaw.includes('[1,0 điểm]'));
  assert(!question.statementRaw.includes('\\textbf{(1,0 điểm)}'));
  assert.equal(report.issues.filter((i) => i.severity === 'error').length, 0);
  const restored = restoreQuestionSource(question);
  assert.equal(restored.statementRaw, parsed.statementRaw);
  assert.equal(restored.solutionRaw, parsed.solutionRaw);
  const again = normalizeQuestion(question).question;
  assert.equal(again.statementRaw, question.statementRaw);
  assert.equal(again.solutionRaw, question.solutionRaw);
  assert.equal(again.raw, input);
});

test('normalization never guesses logic, data, missing answers, paths or incomplete drawings', () => {
  const question = {
    id: crypto.randomUUID(),
    label: 'Bài 13',
    number: 13,
    sourceType: 'tex' as const,
    statementRaw: String.raw`[SGK Toán 9 - Kết nối tri thức]
Giá $2.5$ đồng; $x\Rightarrow y$. \url{https://site.org/a_frac.tex}
\begin{tikzpicture}\draw (2.5,0);`,
    solutionRaw: '',
  };
  const { question: normalized, report } = normalizeQuestion(question);
  assert.equal(normalized.number, 13);
  assert.equal(normalized.solutionRaw, '');
  assert.match(normalized.statementRaw, /2\.5/);
  assert.match(normalized.statementRaw, /\\Rightarrow/);
  assert.match(normalized.statementRaw, /a_frac\.tex/);
  assert(report.issues.some((i) => i.severity === 'error' && i.message.includes('tikzpicture')));
  assert(report.issues.some((i) => i.message.includes('Chưa có lời giải')));
  const word = {
    ...question,
    sourceType: 'word' as const,
    statementRaw: '<p>Giá 50% và 2.5 đồng.</p>',
  };
  assert.equal(normalizeQuestion(word).question.statementRaw, word.statementRaw);
});

test('syntax diagnostics locate mismatched braces, environments and math without changing source', () => {
  const input = 'Bài toán\n$x+1\n\\begin{enumerate}\\item {A';
  const issues = inspectTex(input);
  assert(issues.some((i) => i.line === 2 && i.message.includes('Công thức')));
  assert(issues.some((i) => i.line === 3 && i.message.includes('enumerate')));
  assert(issues.some((i) => i.line === 3 && i.message.includes('ngoặc')));
  assert.deepEqual(
    inspectTex(String.raw`Tỉ lệ $50\%$ và tập $\{1;2\}$. % $ ignored
\begin{enumerate}\item $x=1$.\end{enumerate}`),
    [],
  );
});
