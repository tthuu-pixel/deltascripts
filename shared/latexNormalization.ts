import type { Question } from '../src/types';
import { lockTex, formatEssayTex, hasAnswerChoices } from './essayNormalization';
import { normalizeQuestion, inspectTex } from './importReview';
import { questionEnvironment } from './questionEnvironment';
import { groupEnd, environmentRanges } from './texSyntax';

function canonicalAlternatives(source: string) {
  let from = 0;
  for (let count = 0; count < 1000; count++) {
    const match = /\\hoac\s*\{/.exec(source.slice(from));
    if (!match) break;
    const start = from + match.index,
      open = start + match[0].length - 1,
      end = groupEnd(source, open);
    if (end < 0) break;
    const body = source.slice(open + 1, end),
      rows: string[] = [];
    let depth = 0,
      cursor = 0;
    for (let at = 0; at < body.length; at++) {
      if (body[at] === '\\') {
        if (body[at + 1] === '\\' && depth === 0) {
          rows.push(body.slice(cursor, at).trim().replace(/^&/, ''));
          cursor = at + 2;
        }
        at++;
        continue;
      }
      if (body[at] === '{') depth++;
      if (body[at] === '}') depth--;
    }
    rows.push(body.slice(cursor).trim().replace(/^&/, ''));
    if (rows.length < 2) {
      from = end + 1;
      continue;
    }
    const replacement = rows.join(' hoặc ');
    source = source.slice(0, start) + replacement + source.slice(end + 1);
    from = start + replacement.length;
  }
  return source;
}
function canonicalDecimals(source: string) {
  let depth = 0,
    sets = 0,
    result = '';
  for (let at = 0; at < source.length; at++) {
    const c = source[at];
    if (c === '\\' && ['{', '}', '(', ')', '[', ']'].includes(source[at + 1] || '')) {
      if (source[at + 1] === '{') sets++;
      if (source[at + 1] === '}') sets = Math.max(0, sets - 1);
      result += c + source[++at];
      continue;
    }
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    result +=
      c === ',' &&
      depth === 0 &&
      sets === 0 &&
      /\d/.test(source[at - 1] || '') &&
      /\d/.test(source[at + 1] || '')
        ? '.'
        : c;
  }
  return result;
}
export function normalizationSignature(source: string): string {
  let value = canonicalDecimals(canonicalAlternatives(source))
    .replace(/\\(?:begin|end)\{(?:khung4|boxdn)\}/g, '')
    .replace(/\\(begin|end)\{note\}/g, '\\$1{luuy}')
    .replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (whole, body: string) => {
      const rows = body.split('\\\\').map((row) => row.trim().replace(/^&/, ''));
      return rows.length >= 2 &&
        rows.every((row) => row.includes('=') && !row.includes('&') && !/\\text|nếu|khi/i.test(row))
        ? `\\heva{${body}}`
        : whole;
    })
    .replace(/\\angle\s*([A-Za-z]{3})/g, '\\widehat{$1}')
    .replace(/(\\triangle\s*[A-Z]{3}\s*)\\(?:sim|backsim)\b/g, '$1\\backsim')
    .replace(/\/\//g, '\\parallel')
    .replace(/\\(?:dfrac|tfrac)\b/g, '\\frac')
    .replace(/\\ne\b/g, '\\neq')
    .replace(/\\ge\b/g, '\\geq')
    .replace(/\\le\b/g, '\\leq')
    .replace(/\\choiceTFt\b/g, '\\choiceTF')
    .replace(/\\loigiaiTF\b/g, '\\loigiai')
    .replace(/\\Rightarrow\b|\\implies\b/g, 'Suy ra')
    .replace(/\\Leftrightarrow\b/g, 'tương đương')
    .replace(/\\(?:left|right|displaystyle|quad|qquad)\b|\\[,;! ]/g, '')
    .replace(/(\d)\{,\}(?=\d)/g, '$1.')
    .replace(
      /\\(?:begin|end)\{(?:align\*?|aligned|equation\*?|enumerate|itemize)\}(?:\[[^\]\n]*\])?/g,
      '',
    )
    .replace(/\\item\b(?:\[[^\]\n]*\])?/g, ' DSITEM ')
    .replace(/^\s*[a-z\d]+[.)]\s+(?=\S)/gm, ' DSITEM ')
    .replace(/\$\{([+-]?\d+)\}\$/g, '$$$1$$')
    .replace(/([_^])\{([\p{L}\d])\}/gu, '$1$2')
    .replace(/\\[()[\]]|\$|&|\\\\|\\\s/g, '');
  for (let i = 0; i < 1000; i++) {
    const match = /\\(?:text|textbf|textit|textrm|mathrm|mathit|emph|indam)\s*\{/.exec(value);
    if (!match) break;
    const start = match.index + match[0].length - 1,
      end = groupEnd(value, start);
    if (end < 0) break;
    value = value.slice(0, match.index) + value.slice(start + 1, end) + value.slice(end + 1);
  }
  value = value
    .replace(/suy ra/gi, 'DSIMPLIES')
    .replace(/tương đương/gi, 'DSEQUIV')
    .replace(/hoặc/gi, 'DSOR');
  // Preserve command boundaries: \\sin x must never become an unknown \\sinx command.
  return value.replace(/\\([A-Za-z]+)/g, '⟦$1⟧').replace(/\s+/g, '');
}
function layout(source: string) {
  return {
    wrappers:
      source.match(/\\(?:immini\b|(?:begin|end)\{(?:center|tabular\*?|multicols|listEX)\})/g) || [],
    tables: environmentRanges(source, ['tabular', 'tabular*']).map((range) =>
      source
        .slice(range.bodyStart, range.bodyEnd)
        .split(/\\\\|\\\r?\n/)
        .map((row) =>
          row.split('&').map((cell) => normalizationSignature(cell.replace(/\\hline\b/g, ''))),
        )
        .filter((cells) => cells.some(Boolean)),
    ),
  };
}
export function prepareLatexNormalization(question: Question) {
  if (question.sourceType !== 'tex') throw new Error('Chỉ chuẩn hóa câu hỏi có nguồn TeX.');
  // This deterministic preparation never unwraps immini or changes mathematical content.
  const prepared = normalizeQuestion(question).question;
  const statement = lockTex(prepared.statementRaw),
    solution = lockTex(prepared.solutionRaw);
  return { question: prepared, statement, solution };
}
export function acceptLatexNormalization(
  prepared: ReturnType<typeof prepareLatexNormalization>,
  answer: { statementRaw?: unknown; solutionRaw?: unknown },
): Question {
  const { question, statement, solution } = prepared;
  if (
    typeof answer.statementRaw !== 'string' ||
    typeof answer.solutionRaw !== 'string' ||
    !answer.statementRaw.trim() ||
    answer.statementRaw.length + answer.solutionRaw.length > 1_000_000
  )
    throw new Error('AI chưa trả đủ nguồn chuẩn hóa.');
  for (const [before, after] of [
    [statement.text, answer.statementRaw],
    [solution.text, answer.solutionRaw],
  ]) {
    if (normalizationSignature(before) !== normalizationSignature(after))
      throw new Error('Kết quả có thay đổi nội dung; giữ bản gốc để kiểm tra.');
    if (JSON.stringify(layout(before)) !== JSON.stringify(layout(after)))
      throw new Error('Kết quả thay đổi bố cục bảng, hình hoặc immini; giữ bản gốc.');
  }
  const statementRaw = formatEssayTex(statement.restore(answer.statementRaw));
  const solutionRaw = formatEssayTex(solution.restore(answer.solutionRaw));
  if ([...inspectTex(statementRaw), ...inspectTex(solutionRaw)].some((x) => x.severity === 'error'))
    throw new Error('Cú pháp chưa hoàn chỉnh; giữ bản gốc để kiểm tra.');
  const sourceEnv = questionEnvironment(question) || 'bt';
  const env =
    sourceEnv === 'ex' && !hasAnswerChoices(statementRaw) && !/\\shortans\b/.test(statementRaw)
      ? 'bt'
      : sourceEnv;
  if (!['bt', 'ex', 'vd', 'bai', 'cau', 'problem', 'question'].includes(env))
    throw new Error('Môi trường câu hỏi chưa được hỗ trợ.');
  return {
    ...question,
    statementRaw,
    solutionRaw,
    exerciseEnvironment: env,
    raw: formatEssayTex(
      `\\begin{${env}}\n${statementRaw}\n\\loigiai{\n${solutionRaw}\n}\n\\end{${env}}`,
    ),
  };
}
