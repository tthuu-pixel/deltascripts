import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  parseTexText,
  extractSolution,
  findMatchingBrace,
  normalizeTexContent,
} from '../shared/texParser.ts';
import { buildTikzDocument, extractTikz } from '../shared/tikz.ts';
import { prepareContent } from '../src/utils/displayContent.ts';
import { drawingPreamble } from '../shared/texSyntax.ts';

test('skill: retain declarations outside the picture and technical comments through import/display', async () => {
  for (const file of ['skill-geometry.tex', 'skill-chart.tex']) {
    const source = await readFile(new URL(`./fixtures/${file}`, import.meta.url), 'utf8');
    const [q] = parseTexText(source);
    assert.equal(
      q.raw,
      source.slice(source.indexOf('\\begin{bt}'), source.lastIndexOf('\\end{bt}') + 8),
    );
    const prepared = prepareContent(q.statementRaw, q.latexPreamble);
    assert.equal(prepared.tikz.length, 1);
    const full = buildTikzDocument(prepared.tikz[0].source);
    assert(!full.includes('tkz-euclide'));
    assert(!full.includes('pgfplots'));
    assert(!prepared.tikz[0].source.includes('<br'));
    if (file.includes('geometry')) {
      assert.match(q.latexPreamble!, /\\def\\R\{3\}/);
      assert.match(full, /\\tikzset\{netchinh/);
      assert(full.indexOf('\\DeclareMathOperator') < full.indexOf('\\begin{document}'));
      assert.match(full, /\\begin \{tikzpicture\}/);
      assert(!prepared.html.includes('netchinh'));
    } else {
      assert.match(full, /\{%\n/);
      assert.match(full, /BIỂU ĐỒ\\\\TỈ LỆ/);
      assert.match(full, /3\.6/);
      assert(!full.includes('3{,}6'));
    }
  }
});

test('comments cannot end a solution, introduce a fake environment or swallow a technical percent', () => {
  const source = String.raw`% \begin{ex}fake\end{ex}
\begin{bt}[Câu 2]
Đề $20\%$.\loigiai{\newcommand{\abc}{% } not a closing brace
abc}
Đáp án $2$.% \end{bt}
}
\end{bt}`;
  const [q] = parseTexText(source);
  assert.equal(q.number, 2);
  assert.match(q.solutionRaw, /Đáp án/);
  assert.match(q.solutionRaw, /\{% }/);
  assert.match(q.statementRaw, /20\\%/);
  assert.equal(findMatchingBrace('{a% }\nb}', 0), 7);
  assert.equal(extractSolution('% \\loigiai{fake}\nĐề\\loigiai{thật}').solution, 'thật');
});

test('TikZ supports nested options, inline pictures and scopes without altering decimals or line breaks', () => {
  const source = String.raw`\tikzset{foo/.style={align=center}}
{\def\R{2.5}\tikz[foo]{\node at (\R,0) {Dòng 1\\Dòng 2};}}
\tikz{\draw (0,0)--(2.5,1);}`;
  const { tikz, html } = prepareContent(source);
  assert.equal(tikz.length, 2);
  assert.match(tikz[0].source, /\\def\\R\{2\.5\}/);
  assert.match(tikz[0].source, /Dòng 1\\\\Dòng 2/);
  assert(!tikz[1].source.includes('\\def\\R'));
  assert.match(tikz[1].source, /2\.5/);
  assert(!html.includes('tikzset'));
  assert.equal(extractTikz('% \\begin{tikzpicture}fake').blocks.length, 0);
  const scoped = extractTikz(
    String.raw`\begin{center}\def\R{3}\tikz{\draw(0,0)--(\R,0);}\end{center}\tikz{\draw(0,0)--(1,0);}`,
  );
  assert.match(scoped.blocks[0].source, /\\def\\R/);
  assert(!scoped.blocks[1].source.includes('\\def\\R'));
  assert.equal(
    drawingPreamble(String.raw`\def\R{3}\begin{tikzpicture}\def\R{9}\end{tikzpicture}`),
    String.raw`\def\R{3}`,
  );
});

test('broken environments and braces fail explicitly; no auto-inserted mathematical content', () => {
  assert.throws(() => parseTexText('\\begin{ex}unfinished'), /thiếu/);
  assert.throws(() => prepareContent('\\begin{tikzpicture}oops'), /thiếu/);
  assert.throws(
    () => buildTikzDocument('\\begin{tikzpicture}\\node {A;\\end{tikzpicture}'),
    /ngoặc/,
  );
  assert.throws(
    () => buildTikzDocument('\\begin{tikzpicture}\\begin{scope}\\end{tikzpicture}'),
    /khớp/,
  );
  assert.throws(() => buildTikzDocument('\\tikz{}}'), /thừa/);
});

test('formatting aliases and choices display without changing the stored mathematics or inventing answers', () => {
  const source = String.raw`\begin{ex}Tính $\frac{1}{2}\le x$.\choiceTFt{\True $x=1$}{$x=2$}{$x=3$}{$x=4$}\loigiaiTF{Giữ nguyên $x=5$.}\end{ex}`;
  const [q] = parseTexText(source);
  assert.equal(q.raw, source);
  assert.match(q.statementRaw, /\\frac/);
  assert.match(q.statementRaw, /\\True/);
  assert.equal(q.solutionRaw, 'Giữ nguyên $x=5$.');
  const html = normalizeTexContent(q.statementRaw);
  assert.match(html, /\\dfrac\{1\}\{2\}\\leq x/);
  assert.match(html, /<ol[^>]+type="a"/);
  assert(!html.includes('\\True'));
  assert.equal((html.match(/<li>/g) || []).length, 4);
});
