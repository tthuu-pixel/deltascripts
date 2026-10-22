import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  extractSolution,
  findMatchingBrace,
  normalizeTexContent,
  parseTexText,
  removeTexComments,
} from '../src/parsers/texParser.ts';
import { parseWordFile } from '../src/parsers/wordParser.ts';
import { prepareContent } from '../src/utils/displayContent.ts';
import { remainingSeconds, validExam } from '../src/utils/exam.ts';

test('TeX nested braces and escaped set braces preserve the full solution', () => {
  const source = String.raw`Question\loigiai{Let $A=\{1,2\}$ and $\frac{1}{2}$. Done.}suffix`;
  const parsed = extractSolution(source);
  assert.equal(parsed.statement, 'Questionsuffix');
  assert.match(parsed.solution, /Done\.$/);
  assert.equal(findMatchingBrace(String.raw`{\{x\}}`, 0), 6);
  assert.throws(() => extractSolution(String.raw`Q\loigiai{broken`), /ngoặc/);
});
test('environment solutions, comments and bracketed labels', () => {
  const parsed = parseTexText(String.raw`% header
\begin{ex}[Câu 3]Compute $20\%$.
\begin{loigiai}Answer $2$.\end{loigiai}
\end{ex}`);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].number, 3);
  assert.match(parsed[0].statementRaw, /20\\%/);
  assert.match(parsed[0].solutionRaw, /Answer/);
  assert.equal(removeTexComments(String.raw`a\%b % comment`), String.raw`a\%b `);
});
test('plain question headings skip headers and keep raw math untouched', () => {
  const questions = parseTexText('Đề tham khảo\nCâu 1. First\nCâu 2. Second');
  assert.equal(questions.length, 2);
  assert.equal(questions[1].number, 2);
  const html = normalizeTexContent(String.raw`$$\begin{aligned}x&=1\\ y&=2\end{aligned}$$`);
  assert(!html.includes('<br/>'));
  assert.match(html, /\$\$/);
});
test('TikZ extracted before normalization; math inequalities and percent preserved', () => {
  const prepared = prepareContent(
    String.raw`Find $x<2$ and $50\%$. \begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}`,
  );
  assert.equal(prepared.tikz.length, 1);
  assert.match(prepared.tikz[0].source, /\\draw/);
  assert.match(prepared.html, /x&lt;2/);
  assert.match(prepared.html, /50\\%/);
});
test('legacy escaped math, Word percent text, immini and TeX tables display correctly', () => {
  assert.equal(normalizeTexContent('$x&lt;2$'), '$x&lt;2$');
  assert.match(normalizeTexContent('<p>50% học sinh</p>'), /50% học sinh/);
  const html = normalizeTexContent(
    String.raw`\immini{Text \textbf{nested}}{Diagram}\begin{tabular}{cc}a&b\\c&d\end{tabular}`,
  );
  assert.match(html, /class="immini"/);
  assert.match(html, /<strong>nested<\/strong>/);
  assert.match(html, /<td>d<\/td>/);
});
async function word(paragraphs: string[]) {
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:body>${paragraphs.join('')}</w:body></w:document>`,
  );
  return new File([await zip.generateAsync({ type: 'uint8array' })], 'sample.docx');
}
const paragraph = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
test('DOCX skips headers, separates solutions and escapes HTML', async () => {
  const questions = await parseWordFile(
    await word([
      paragraph('ĐỀ THI'),
      paragraph('Câu 1. Compute &lt;img onerror=&quot;bad()&quot;&gt;'),
      paragraph('Lời giải: Answer 2.'),
      paragraph('Bài 2. Another question'),
    ]),
  );
  assert.equal(questions.length, 2);
  assert.match(questions[0].solutionRaw, /Answer/);
  assert.match(questions[0].statementRaw, /&lt;img/);
  assert(!questions[0].statementRaw.includes('<img'));
});
test('DOCX native Word fractions and exponents are imported as TeX', async () => {
  const file = await word([
    paragraph('Câu 1. Compute'),
    '<w:p><m:oMath><m:f><m:num><m:r><m:t>1</m:t></m:r></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f></m:oMath></w:p>',
  ]);
  const questions = await parseWordFile(file);
  assert.match(questions[0].statementRaw, /\\frac\{1\}\{2\}/);
});
test('bad DOCX fails clearly rather than creating a fake question', async () => {
  await assert.rejects(() => parseWordFile(new File(['bad'], 'broken.docx')));
  await assert.rejects(() => parseWordFile(word as unknown as File));
});
test('exam validates seven unique types and uses a wall-clock deadline', () => {
  const questions = Array.from({ length: 7 }, (_, i) => ({
    number: i + 1,
    statementRaw: 'q',
    solutionRaw: 'a',
  }));
  assert(validExam({ questions, endAt: null, showAnswers: false, createdAt: Date.now() }));
  assert(
    !validExam({
      questions: questions.slice(1),
      endAt: null,
      showAnswers: false,
      createdAt: Date.now(),
    }),
  );
  assert.equal(remainingSeconds(1500, 1000), 1);
  assert.equal(remainingSeconds(1000, 1500), 0);
});

test('lesson TeX document import preserves math, technical comments and drawing declarations', async () => {
  const { readLessonSource } = await import('../shared/lesson.ts');
  const body = String.raw`Tỉ lệ $25\%$, căn thức $\sqrt{(-3)^2}=3$.
\begin{tikzpicture}\draw (0,0)--(2.5,1); % drawing comment
\end{tikzpicture}`;
  const result = readLessonSource(String.raw`\documentclass{article}
\def\R{2.5}
\begin{document}
${body}
\end{document}`);
  assert.equal(result.theory, body);
  assert.match(result.preamble, /\\def\\R\{2\.5\}/);
  assert.equal(readLessonSource(body).theory, body);
  assert.throws(() => readLessonSource(String.raw`\begin{document}Missing end`), /thiếu/);
});
