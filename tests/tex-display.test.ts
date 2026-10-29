import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTexContent } from '../shared/texParser';
import { prepareContent } from '../src/utils/displayContent';

test('nested tabular headers keep their own rows and do not split outer columns', () => {
  const source = String.raw`\begin{tabular}{|c|c|c|}
\hline & \begin{tabular}[c]{@{}c@{}}Việt\\Nam\end{tabular} & R\&D \\
\hline Vàng & $87$ & $233$ \\[7pt]\hline
\end{tabular}`;
  const html = normalizeTexContent(source);
  assert.equal((html.match(/<table\b/g) || []).length, 2);
  assert.equal((html.match(/<tr>/g) || []).length, 4);
  assert.match(html, /<td>R&amp;D<\/td>/);
  assert.match(html, /<td>\$87\$<\/td>/);
  assert(!/\\(?:begin|end|hline)|\[7pt\]/.test(html));
  assert.match(source, /\\begin\{tabular\}\[c\]/); // Display conversion never rewrites its input.
});

test('multirow continuations and multicolumn headers preserve the table grid', () => {
  const html = normalizeTexContent(String.raw`\begin{tabular}{|c|c|c|}
\multirow{2}{*}{\textbf{Cửa hàng}} & \multicolumn{2}{c|}{Ngày} \\
\cline{2-3} & Thứ hai & Thứ ba \\
X & $12$ & $15$ \\
\end{tabular}`);
  assert.match(html, /<td rowspan="2"><strong>Cửa hàng<\/strong><\/td><td colspan="2">Ngày<\/td>/);
  assert.match(html, /<tr><td>Thứ hai<\/td><td>Thứ ba<\/td><\/tr>/);
  assert(!/\\(?:multirow|multicolumn|cline)/.test(html));
});

test('quote pairs and listEX render as text and lists while mathematical data and TikZ stay intact', () => {
  const drawing = String.raw`\begin{tikzpicture}\node at (2.5,0) {\lq\lq X\rq\rq};\end{tikzpicture}`;
  const source =
    String.raw`Biến cố \lq\lq Có đúng $2$ kết quả\rq\rq.
\begin{listEX}[2]\item Tính $\dfrac{1}{2}$.\item Giữ $-1$.\end{listEX}` + drawing;
  const prepared = prepareContent(source);
  assert.match(prepared.html, /&quot; Có đúng \$2\$ kết quả&quot;/);
  assert.match(prepared.html, /<ol class="[^"]*tex-list-cols-2/);
  assert.equal((prepared.html.match(/<li>/g) || []).length, 2);
  assert(!/\\(?:lq|rq|begin\{listEX|end\{listEX)/.test(prepared.html));
  assert.match(prepared.tikz[0].source, /\(2\.5,0\).*\\lq\\lq X\\rq\\rq/);
  assert.match(prepared.html, /\$\\dfrac\{1\}\{2\}\$/);
});
