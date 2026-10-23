import type { Question } from '../src/types';
import { normalizeQuestion, protectedRanges } from './importReview';
import { parseTexText } from './texParser';
import { sourceEnvironment } from './questionEnvironment';
import { groupEnd, maskTexComments, skipSpace, texCommands } from './texSyntax';

export function hasAnswerChoices(source: string): boolean {
  const protectedParts = protectedRanges(source);
  return [...texCommands(source)].some(
    (m) =>
      /^(?:choice(?:TFt?|[A-Z]+)?|choide)$/.test(m[1]) &&
      !protectedParts.some((r) => m.index! >= r.start && m.index! < r.end),
  );
}
export function canProcessEssay(
  q: Pick<Question, 'sourceType' | 'raw' | 'statementRaw' | 'exerciseEnvironment'>,
): boolean {
  if (q.sourceType !== 'tex') return false;
  const env = q.raw?.trim() ? sourceEnvironment(q.raw) : q.exerciseEnvironment;
  try {
    return (
      (env === 'bt' || env === 'ex') &&
      !hasAnswerChoices(q.statementRaw) &&
      !hasAnswerChoices(q.raw || '')
    );
  } catch {
    return false;
  }
}

// These opaque tokens never expose drawing code to the model. Every token must survive once,
// in the original order, before a response can be restored and accepted.
export function lockTex(source: string) {
  const parts: { token: string; source: string }[] = [];
  const nonce = crypto.randomUUID().replace(/-/g, '');
  let cursor = 0,
    text = '';
  for (const r of protectedRanges(source)) {
    if (r.start < cursor) continue;
    const token = `DSLOCK${nonce}X${parts.length}END`;
    text += source.slice(cursor, r.start) + token;
    parts.push({ token, source: source.slice(r.start, r.end) });
    cursor = r.end;
  }
  text += source.slice(cursor);
  return {
    text,
    restore(value: string) {
      const tokens = value.match(/DSLOCK[a-f0-9]{32}X\d+END/g) || [];
      if (JSON.stringify(tokens) !== JSON.stringify(parts.map((p) => p.token)))
        throw new Error('Chưa giữ đủ hình và khai báo được khóa.');
      for (const part of parts) value = value.replace(part.token, () => part.source);
      return value;
    },
  };
}
export function removeImmini(source: string): string {
  const locked = lockTex(source);
  let text = locked.text;
  for (let count = 0; count < 1000; count++) {
    const match = /\\immini\b\s*\*?/.exec(maskTexComments(text));
    if (!match) break;
    let at = skipSpace(text, match.index + match[0].length);
    if (text[at] === '[') {
      const end = groupEnd(text, at);
      if (end < 0) throw new Error('Thiếu ] trong immini.');
      at = skipSpace(text, end + 1);
    }
    const firstEnd = groupEnd(text, at);
    if (firstEnd < 0) throw new Error('Thiếu đối số đầu của immini.');
    const second = skipSpace(text, firstEnd + 1),
      secondEnd = groupEnd(text, second);
    if (secondEnd < 0) throw new Error('Thiếu đối số hình của immini.');
    const replacement = `\n\\begingroup\n${text.slice(at + 1, firstEnd).trim()}\n\\endgroup\n\\begin{center}\n${text.slice(second + 1, secondEnd).trim()}\n\\end{center}`;
    text = text.slice(0, match.index) + replacement + text.slice(secondEnd + 1);
  }
  return locked.restore(text);
}
export function formatEssayTex(source: string): string {
  const locked = lockTex(source);
  let depth = 0;
  const lines = locked.text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const visible = maskTexComments(line);
      const closes = (visible.match(/^}(?=\s|$)|^\\end\{|^\\endgroup\b/) || []).length ? 1 : 0;
      const formatted = '\t'.repeat(Math.max(0, Math.min(30, depth - closes))) + line;
      for (const m of texCommands(visible)) {
        if (m[1] === 'begin' || m[1] === 'begingroup') depth++;
        if (m[1] === 'end' || m[1] === 'endgroup') depth--;
      }
      // Multiline solution groups are an extra indentation level. Formula groups balance on a line.
      let braces = 0;
      for (let i = 0; i < visible.length; i++) {
        if (visible[i] === '\\') i++;
        else if (visible[i] === '{') braces++;
        else if (visible[i] === '}') braces--;
      }
      depth = Math.max(0, depth + braces);
      return formatted;
    });
  return locked.restore(lines.join('\n'));
}
export function normalizeEssayQuestion(input: Question): Question {
  if (input.sourceType !== 'tex') return { ...input };
  let q: Question = { ...input };
  // Keep the first uploaded source through repeated passes, including AI edits.
  q.originalRaw ||=
    input.raw ||
    `\\begin{${input.exerciseEnvironment || 'bt'}}\n${input.statementRaw}\n\\loigiai{${input.solutionRaw}}\n\\end{${input.exerciseEnvironment || 'bt'}}`;
  try {
    q = { ...normalizeQuestion(q).question };
  } catch {
    /* AI can repair incomplete prose/math below. */
  }
  q.statementRaw = removeImmini(q.statementRaw);
  q.solutionRaw = removeImmini(q.solutionRaw);
  const env = sourceEnvironment(input.raw || '') || input.exerciseEnvironment || 'bt';
  const nextEnv = env === 'ex' && !hasAnswerChoices(q.statementRaw) ? 'bt' : env;
  q.statementRaw = formatEssayTex(q.statementRaw);
  q.solutionRaw = formatEssayTex(q.solutionRaw);
  q.exerciseEnvironment = nextEnv;
  q.raw = formatEssayTex(
    `\\begin{${nextEnv}}\n${q.statementRaw}\n\\loigiai{\n${q.solutionRaw}\n}\n\\end{${nextEnv}}`,
  );
  q.sourceLength = q.statementRaw.length;
  return q;
}

// Recover a missing outer exercise closing tag without discarding other complete exercises.
// The initial source is retained separately; malformed drawings are never reconstructed here.
export function parseRepairableTex(source: string): Question[] {
  try {
    return parseTexText(source);
  } catch (originalError) {
    for (const env of ['bt', 'ex']) {
      const suffix = `\n\\end{${env}}`;
      try {
        const parsed = parseTexText(source + suffix);
        if (!parsed.length) continue;
        const last = parsed.at(-1)!;
        if (!last.raw?.endsWith(suffix)) continue;
        last.originalRaw = last.raw.slice(0, -suffix.length);
        return parsed;
      } catch {
        /* Try the other explicit exercise environment. */
      }
    }
    throw originalError;
  }
}
