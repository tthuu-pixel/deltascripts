import type { Question } from '../src/types';
import { parseTexText } from './texParser';
import {
  declarationEnd,
  environmentRanges,
  groupEnd,
  maskTexComments,
  texCommands,
} from './texSyntax';

export interface TexIssue {
  severity: 'error' | 'warning';
  message: string;
  line: number;
}
export interface NormalizationReport {
  changes: string[];
  issues: TexIssue[];
  points: string[];
  codes: string[];
}

export function restoreQuestionSource(question: Question): Question {
  if (!question.raw) throw new Error('Câu này chưa có nguồn gốc được lưu.');
  if (question.sourceType === 'word') {
    const marker = '\n<!-- Lời giải gốc -->\n';
    const position = question.raw.indexOf(marker);
    if (position < 0)
      throw new Error(
        'Chưa tách được đề/lời giải từ nguồn Word cũ. Bạn có thể sao chép nguồn để sửa.',
      );
    return {
      ...question,
      statementRaw: question.raw.slice(0, position),
      solutionRaw: question.raw.slice(position + marker.length),
    };
  }
  const parsed = parseTexText(question.raw);
  if (parsed.length !== 1)
    throw new Error('Nguồn gốc chứa nhiều bài. Hãy đối chiếu và sửa nguồn đang dùng.');
  return { ...question, statementRaw: parsed[0].statementRaw, solutionRaw: parsed[0].solutionRaw };
}

// Only transform prose/math outside executable drawing code, macro declarations and comments.
export function protectedRanges(source: string) {
  const visible = maskTexComments(source);
  const ranges = environmentRanges(source, ['tikzpicture', 'axis', 'verbatim', 'lstlisting']);
  const protectedParts: { start: number; end: number }[] = [...ranges];
  let until = 0;
  for (const match of texCommands(source)) {
    if (match.index! < until || ranges.some((r) => match.index! >= r.start && match.index! < r.end))
      continue;
    const end = declarationEnd(visible, match.index!, match[1]);
    if (end >= 0) {
      protectedParts.push({ start: match.index!, end });
      until = end;
    } else if (['url', 'href', 'includegraphics'].includes(match[1])) {
      let cursor = match.index! + match[0].length;
      while (/\s/.test(visible[cursor] || '')) cursor++;
      if (visible[cursor] === '[') cursor = groupEnd(visible, cursor) + 1;
      while (/\s/.test(visible[cursor] || '')) cursor++;
      const close = groupEnd(visible, cursor);
      if (close >= 0) protectedParts.push({ start: match.index!, end: close + 1 });
    }
  }
  for (const match of source.matchAll(/\\[\s\S]|%[^\n]*/g)) {
    if (
      match[0].startsWith('%') &&
      !protectedParts.some((r) => match.index! >= r.start && match.index! < r.end)
    )
      protectedParts.push({ start: match.index!, end: match.index! + match[0].length });
  }
  return protectedParts.sort((a, b) => a.start - b.start);
}

export function inspectTex(source: string): TexIssue[] {
  const issues: TexIssue[] = [];
  const visible = maskTexComments(source);
  const line = (at: number) => visible.slice(0, at).split('\n').length;
  const stack: number[] = [];
  const environments: { name: string; at: number }[] = [];
  let math: { delimiter: string; at: number } | null = null;
  for (let i = 0; i < visible.length; i++) {
    const char = visible[i];
    if (char === '\\') {
      const env = /^\\(begin|end)\s*\{([^}]+)\}/.exec(visible.slice(i));
      if (env) {
        if (env[1] === 'begin') environments.push({ name: env[2], at: i });
        else if (environments.at(-1)?.name === env[2]) environments.pop();
        else
          issues.push({
            severity: 'error',
            line: line(i),
            message: `Môi trường ${env[2]} đóng không khớp.`,
          });
        i += env[0].length - 1;
        continue;
      }
      const delimiter = visible[i + 1];
      if (['(', '['].includes(delimiter) && !math) math = { delimiter: '\\' + delimiter, at: i };
      else if ([')', ']'].includes(delimiter)) {
        if (math?.delimiter === (delimiter === ')' ? '\\(' : '\\[')) math = null;
        else
          issues.push({
            severity: 'error',
            line: line(i),
            message: 'Dấu đóng công thức không khớp.',
          });
      }
      i++;
      continue;
    }
    if (char === '{') stack.push(i);
    else if (char === '}') {
      if (stack.length) stack.pop();
      else issues.push({ severity: 'error', line: line(i), message: 'Thừa dấu ngoặc đóng }.' });
    } else if (char === '$') {
      const delimiter = visible[i + 1] === '$' ? '$$' : '$';
      if (!math) math = { delimiter, at: i };
      else if (math.delimiter === delimiter) math = null;
      else
        issues.push({
          severity: 'error',
          line: line(i),
          message: 'Dấu phân cách công thức không khớp.',
        });
      if (delimiter === '$$') i++;
    }
  }
  if (stack.length)
    issues.push({ severity: 'error', line: line(stack[0]), message: 'Thiếu dấu ngoặc đóng }.' });
  if (math)
    issues.push({
      severity: 'error',
      line: line(math.at),
      message: `Công thức chưa đóng ${math.delimiter}.`,
    });
  for (const env of environments)
    issues.push({
      severity: 'error',
      line: line(env.at),
      message: `Môi trường ${env.name} chưa có lệnh đóng.`,
    });
  for (const match of visible.matchAll(
    /\\(?:input|include|includegraphics|tkz\w+|pgfplots\w*)\b|\\begin\{axis\}/g,
  )) {
    issues.push({
      severity: 'warning',
      line: line(match.index!),
      message: `Cần kiểm tra ${match[0]}: có thể cần tệp ngoài hoặc thư viện chưa được hỗ trợ trên web.`,
    });
  }
  if (/\\(?:Rightarrow|Leftrightarrow|implies|hoac|begin\{cases\})\b/.test(visible))
    issues.push({
      severity: 'warning',
      line: 1,
      message:
        'Có ký hiệu logic hoặc cases cần bạn duyệt theo ngữ cảnh; hệ thống giữ nguyên ý nghĩa nguồn.',
    });
  return issues.slice(0, 100);
}

export function normalizeQuestion(input: Question): {
  question: Question;
  report: NormalizationReport;
} {
  const changes = new Set<string>();
  const points: string[] = [];
  const codes = [
    ...(input.raw || input.statementRaw).matchAll(/%\s*\[([0-9][A-Z][^\]\n]{0,80})\]/g),
  ].map((m) => m[1]);
  function normalize(source: string, statement: boolean) {
    if (input.sourceType !== 'tex') return source;
    let value = source.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
    // An exercise's optional score/source belongs to its header, not its problem body.
    if (statement) {
      value = value.replace(/^\s*\[(\d+(?:[,.]\d+)?\s*điểm)\]\s*/i, (_, score) => {
        points.push(score);
        changes.add('Tách điểm số khỏi đề bài; thông tin được giữ trong nguồn gốc.');
        return '';
      });
      value = value.replace(
        /^\s*\[(?:Trích đề|SGK|SBT|THPT|THCS|Tài liệu|Đề thi|Đề kiểm tra)[^\]\n]*\]\s*/i,
        () => {
          changes.add('Tách thông tin nguồn đề ở đầu bài; bản gốc được giữ nguyên.');
          return '';
        },
      );
      value = value.replace(
        /^((?:\s|%[^\n]*\n)*)\\textbf\s*\{\s*\((\d+(?:[,.]\d+)?\s*điểm)\)\s*\}\s*/i,
        (_, prefix, score) => {
          points.push(score);
          changes.add('Tách điểm số khỏi đề bài; thông tin được giữ trong nguồn gốc.');
          return prefix;
        },
      );
    }
    try {
      const ranges = protectedRanges(value);
      let cursor = 0;
      const transform = (fragment: string) =>
        fragment
          .replace(/\\(frac|ne|ge|le|quad|choiceTFt|loigiaiTF)\b/g, (token, command: string) => {
            const replacement: Record<string, string> = {
              frac: '\\dfrac',
              ne: '\\neq',
              ge: '\\geq',
              le: '\\leq',
              quad: '\\;',
              choiceTFt: '\\choiceTF',
              loigiaiTF: '\\loigiai',
            };
            changes.add(
              'Chuẩn hóa lệnh phân số, quan hệ, khoảng cách và trắc nghiệm theo bộ quy tắc.',
            );
            return replacement[command] || token;
          })
          .replace(/\\begin\{enumerate\}\[[^\]\n]*\]/g, () => {
            changes.add('Chuẩn hóa tùy chọn enumerate, giữ thứ tự các ý.');
            return '\\begin{enumerate}';
          });
      let normalized = '';
      for (const range of ranges) {
        if (range.start < cursor) continue;
        normalized += transform(value.slice(cursor, range.start));
        const part = value.slice(range.start, range.end);
        if (/^%\s*(?:\[[^\]\n]+\]\s*)+%?\s*$/.test(part) || /^%{2,}[=\-_%\w\s]*$/.test(part)) {
          // Keep a technical '%' so removal never joins words or changes macro line spacing.
          normalized += '%';
          changes.add('Bỏ comment mã nguồn/đường phân cách; giữ dấu % kỹ thuật và bản gốc.');
        } else normalized += part;
        cursor = range.end;
      }
      value = normalized + transform(value.slice(cursor));
    } catch {
      // Incomplete drawing/declaration: report it and keep executable source untouched.
    }
    return value;
  }
  const question = {
    ...input,
    raw:
      input.raw ||
      (input.sourceType === 'tex'
        ? `${input.statementRaw}\n\\loigiai{${input.solutionRaw}}`
        : `${input.statementRaw}\n<!-- Lời giải gốc -->\n${input.solutionRaw}`),
    statementRaw: normalize(input.statementRaw, true),
    solutionRaw: normalize(input.solutionRaw, false),
  };
  const issues: TexIssue[] =
    input.sourceType === 'tex'
      ? [
          ...inspectTex(question.statementRaw).map((i) => ({
            ...i,
            message: `Đề bài: ${i.message}`,
          })),
          ...inspectTex(question.solutionRaw).map((i) => ({
            ...i,
            message: `Lời giải: ${i.message}`,
          })),
        ]
      : [];
  if (!question.statementRaw.trim())
    issues.push({ severity: 'error', line: 1, message: 'Đề bài trống.' });
  if (!question.solutionRaw.trim())
    issues.push({
      severity: 'warning',
      line: 1,
      message: 'Chưa có lời giải; hệ thống không tự bổ sung.',
    });
  return {
    question,
    report: {
      changes: [...changes],
      issues,
      points: [...new Set(points)],
      codes: [...new Set(codes)],
    },
  };
}
