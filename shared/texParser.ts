import type { Question } from '../src/types.ts';

import {
  drawingPreamble,
  environmentRanges,
  findMatchingBrace,
  maskTexComments,
} from './texSyntax.ts';
import { extractTikz } from './tikz.ts';
export { findMatchingBrace } from './texSyntax.ts';

export function removeTexComments(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '\\') {
          i++;
          continue;
        }
        if (line[i] === '%') return line.slice(0, i);
      }
      return line;
    })
    .join('\n');
}
export function extractSolution(text: string): { statement: string; solution: string } {
  const visible = maskTexComments(text);
  const command = /\\(?:loigiaiTF|loigiai)\s*\{/.exec(visible);
  if (command) {
    const start = command.index + command[0].lastIndexOf('{');
    const end = findMatchingBrace(text, start);
    if (end < 0) throw new Error('Lời giải thiếu dấu ngoặc đóng }.');
    return {
      statement: (text.slice(0, command.index) + text.slice(end + 1)).trim(),
      solution: text.slice(start + 1, end).trim(),
    };
  }
  const env = environmentRanges(text, ['loigiai', 'loigiaiTF'])[0];
  return env
    ? {
        statement: (text.slice(0, env.start) + text.slice(env.end)).trim(),
        solution: text.slice(env.bodyStart, env.bodyEnd).trim(),
      }
    : { statement: text.trim(), solution: '' };
}
export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Applied only when displaying. Stored questions retain their original TeX.
export function normalizeTexContent(text: string): string {
  if (typeof text !== 'string') return '';
  const math: string[] = [];
  const displaySource = /<(?:p|div|table|img|strong)\b/i.test(text)
    ? text
    : removeTexComments(text);
  let value = displaySource.replace(
    /\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\\])*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\begin\{(align\*?|aligned|equation\*?|eqnarray\*?)\}[\s\S]*?\\end\{\1\}/g,
    (token) => {
      if (token.startsWith('\\begin'))
        token =
          '$$' +
          token
            .replace(/\\(?:begin|end)\{equation\*?\}/g, '')
            .replace(/\{(?:align\*?|eqnarray\*?)\}/g, '{aligned}') +
          '$$';
      token = token.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      // Formatting aliases only; never change numbers, logic or TikZ machine expressions.
      token = token.replace(
        /\\(frac|ne|ge|le|quad)\b/g,
        (_, command: string) =>
          ({ frac: '\\dfrac', ne: '\\neq', ge: '\\geq', le: '\\leq', quad: '\\;' })[command]!,
      );
      math.push(escapeHtml(token));
      return `DSMATHTOKEN${math.length - 1}END`;
    },
  );
  value = value
    .replace(/\\begin\{(?:bt|ex|vd|bai|cau|problem|question)\}(?:\[[^\]]*\])?/g, '')
    .replace(/\\end\{(?:bt|ex|vd|bai|cau|problem|question)\}/g, '');
  const immini = /\\immini\s*\{/g;
  let im: RegExpExecArray | null;
  while ((im = immini.exec(value))) {
    const first = im.index + im[0].lastIndexOf('{'),
      firstEnd = findMatchingBrace(value, first);
    if (firstEnd < 0) break;
    const rest = /^\s*\{/.exec(value.slice(firstEnd + 1));
    if (!rest) break;
    const second = firstEnd + 1 + rest[0].lastIndexOf('{'),
      secondEnd = findMatchingBrace(value, second);
    if (secondEnd < 0) break;
    const result = `<div class="immini"><div>${value.slice(first + 1, firstEnd)}</div><div>${value.slice(second + 1, secondEnd)}</div></div>`;
    value = value.slice(0, im.index) + result + value.slice(secondEnd + 1);
    immini.lastIndex = im.index + result.length;
  }
  value = value.replace(
    /\\begin\{tabular\}\{(?:[^{}]|\{[^{}]*\})*\}([\s\S]*?)\\end\{tabular\}/g,
    (_, body: string) =>
      '<table><tbody>' +
      body
        .replace(/\\hline/g, '')
        .split('\\\\')
        .filter((row) => row.trim())
        .map(
          (row) =>
            '<tr>' +
            row
              .split('&')
              .map((cell) => `<td>${cell.trim()}</td>`)
              .join('') +
            '</tr>',
        )
        .join('') +
      '</tbody></table>',
  );
  for (const [command, tag] of [
    ['textbf', 'strong'],
    ['emph', 'em'],
    ['textit', 'em'],
  ] as const) {
    const regex = new RegExp(`\\\\${command}\\s*\\{`, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value))) {
      const start = match.index + match[0].lastIndexOf('{'),
        end = findMatchingBrace(value, start);
      if (end < 0) break;
      value =
        value.slice(0, match.index) +
        `<${tag}>` +
        value.slice(start + 1, end) +
        `</${tag}>` +
        value.slice(end + 1);
      regex.lastIndex = match.index + tag.length + 2;
    }
  }
  value = value.replace(/\\choiceTFt\b/g, '\\choiceTF');
  const choices = /\\(choiceTF|choice)\b/g;
  let choice: RegExpExecArray | null;
  while ((choice = choices.exec(value))) {
    const options: string[] = [];
    let cursor = choice.index + choice[0].length;
    for (let i = 0; i < 4; i++) {
      while (/\s/.test(value[cursor] || '') && cursor < value.length) cursor++;
      const end = findMatchingBrace(value, cursor);
      if (end < 0) break;
      options.push(value.slice(cursor + 1, end).replace(/\\True\b\s*/g, ''));
      cursor = end + 1;
    }
    // Keep incomplete sources visible instead of inventing or dropping an option.
    if (options.length !== 4) continue;
    const html = `<ol class="ml-6" type="${choice[1] === 'choice' ? 'A' : 'a'}">${options.map((option) => `<li>${option}</li>`).join('')}</ol>`;
    value = value.slice(0, choice.index) + html + value.slice(cursor);
    choices.lastIndex = choice.index + html.length;
  }
  value = value
    .replace(/\\(?:begingroup|endgroup)\b/g, '')
    .replace(/\\begin\{center\}/g, '<div class="text-center">')
    .replace(/\\end\{center\}/g, '</div>')
    .replace(/\\begin\{itemize\}/g, '<ul class="list-disc ml-6">')
    .replace(/\\end\{itemize\}/g, '</ul>')
    .replace(/\\begin\{enumerate\}(?:\[[^\]]*\])?/g, '<ol class="list-decimal ml-6">')
    .replace(/\\end\{enumerate\}/g, '</ol>')
    .replace(/\\item(?:\[[^\]]*\])?\s*/g, '<li>')
    .replace(/\\\\/g, '<br/>');
  // Leave actual HTML intact; escape inequalities and other bare '<' characters.
  value = value.replace(/<(?!\/?[a-z][a-z0-9]*(?:\s|\/?>))/gi, '&lt;');
  return value.replace(/DSMATHTOKEN(\d+)END/g, (_, index) => math[Number(index)] ?? '');
}
export function parseTexText(input: string): Question[] {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const visible = maskTexComments(text);
  const matches = environmentRanges(text, ['bt', 'ex', 'vd', 'bai', 'cau', 'problem', 'question']);
  const labelPattern = /(?:^|\n)\s*(?:\\textbf\{)?\[?(?:Câu|Bài|Ví dụ)\s+(\d+)\]?[^\S\n]*[.:]?/gi;
  let preamble = '';
  let blocks: {
    content: string;
    raw: string;
    fallback: number;
    preamble: string;
    environment: string | null;
  }[];
  if (matches.length) {
    let previous = 0;
    blocks = matches.map((m, i) => {
      const declarations = drawingPreamble(text.slice(previous, m.start));
      preamble = [preamble, declarations].filter(Boolean).join('\n');
      previous = m.end;
      return {
        content: text.slice(m.bodyStart, m.bodyEnd),
        raw: text.slice(m.start, m.end),
        fallback: i + 1,
        preamble,
        environment: m.name,
      };
    });
  } else {
    const labels = [...visible.matchAll(labelPattern)];
    preamble = labels.length ? drawingPreamble(text.slice(0, labels[0].index)) : '';
    blocks = labels.length
      ? labels.map((m, i) => ({
          content: text.slice(m.index!, labels[i + 1]?.index ?? text.length),
          raw: text.slice(m.index!, labels[i + 1]?.index ?? text.length),
          fallback: Number(m[1]),
          preamble,
          environment: null,
        }))
      : [{ content: text, raw: input, fallback: 1, preamble: '', environment: null }];
  }
  return blocks
    .filter((b) => maskTexComments(b.content).trim())
    .map(({ content, raw, fallback, preamble, environment }) => {
      const { statement, solution } = extractSolution(content);
      const label = maskTexComments(statement).match(
        /^(?:\s*\\textbf\{)?\s*\[?(Câu|Bài|Ví dụ)\s+(\d+)\]?[.:]?\}?/i,
      );
      const number = label ? Number(label[2]) : fallback;
      return {
        id: crypto.randomUUID(),
        label: label ? `${label[1]} ${number}` : `Câu ${number}`,
        number,
        numberOrigin: label ? ('explicit' as const) : ('order' as const),
        statementRaw: label ? statement.slice(label[0].length).trim() : statement,
        solutionRaw: solution,
        sourceType: 'tex' as const,
        exerciseEnvironment: environment,
        raw,
        latexPreamble: preamble,
        rawTikzBlocks: extractTikz(content, preamble).blocks.map((b) => b.source),
        rawImageRefs: [
          ...maskTexComments(content).matchAll(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g),
        ].map((m) => m[1]),
      };
    });
}
export async function parseTexFile(file: File) {
  return parseTexText(await file.text());
}
