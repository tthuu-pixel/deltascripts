// Mask rather than delete comments so source offsets and technical '%' remain intact.
export function maskTexComments(source: string): string {
  return source.replace(/\\[\s\S]|%[^\r\n]*/g, (token) =>
    token.startsWith('%') ? ' '.repeat(token.length) : token,
  );
}

export function findMatchingBrace(text: string, start: number): number {
  return matchingVisibleBrace(maskTexComments(text), start);
}

// Internal scanners already hold masked text; avoid re-scanning the full file per group.
export function matchingVisibleBrace(text: string, start: number): number {
  if (text[start] !== '{') return -1;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

export const texCommands = (source: string) =>
  maskTexComments(source).matchAll(/\\([a-zA-Z@]+|[^a-zA-Z@])/g);

export function skipSpace(text: string, start: number): number {
  while (/\s/.test(text[start] || '') && start < text.length) start++;
  return start;
}

export function groupEnd(text: string, start: number): number {
  if (text[start] === '{') return matchingVisibleBrace(text, start);
  if (text[start] !== '[') return -1;
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '{') {
      i = matchingVisibleBrace(text, i);
      if (i < 0) return -1;
    } else if (text[i] === ']') return i;
  }
  return -1;
}

export interface TexRange {
  start: number;
  end: number;
}

// Recognize complete declarations, including nested bodies. Never run broad substitutions
// on these bodies: decimal points, '\\' and technical comments are executable TeX here.
export function declarationEnd(visible: string, start: number, command: string): number {
  let cursor = skipSpace(visible, start + command.length + 1);
  const group = () => {
    cursor = skipSpace(visible, cursor);
    const end = groupEnd(visible, cursor);
    if (end < 0) throw new Error(`Khai báo \\${command} thiếu ngoặc đóng.`);
    cursor = end + 1;
  };
  const macro = () => {
    cursor = skipSpace(visible, cursor);
    if (visible[cursor] === '{') group();
    else {
      const match = /^\\(?:[a-zA-Z@]+|.)/.exec(visible.slice(cursor));
      if (!match) throw new Error(`Khai báo \\${command} thiếu tên macro.`);
      cursor += match[0].length;
    }
  };
  if (/^(?:newcommand|renewcommand|providecommand|DeclareMathOperator)$/.test(command)) {
    if (visible[cursor] === '*') cursor++;
    macro();
    while (visible[skipSpace(visible, cursor)] === '[') group();
    group();
  } else if (/^(?:def|gdef|edef|xdef)$/.test(command)) {
    macro();
    while (cursor < visible.length && visible[cursor] !== '{') cursor++;
    group();
  } else if (/^pgfmath(?:setmacro|setlengthmacro|truncatemacro)$/.test(command)) {
    macro();
    group();
  } else if (command === 'definecolor') {
    group();
    group();
    group();
  } else if (command === 'colorlet') {
    group();
    if (visible[skipSpace(visible, cursor)] === '[') group();
    group();
  } else if (/^(?:tikzset|pgfkeys|pgfplotsset|usetikzlibrary|usepgflibrary)$/.test(command)) {
    group();
  } else return -1;
  return cursor;
}

export interface EnvironmentRange extends TexRange {
  name: string;
  bodyStart: number;
  bodyEnd: number;
}

export function environmentRanges(source: string, names: readonly string[]): EnvironmentRange[] {
  const visible = maskTexComments(source);
  const result: EnvironmentRange[] = [];
  const stack: { name: string; start: number; bodyStart: number }[] = [];
  let until = 0;
  for (const match of texCommands(source)) {
    if (match.index! < until) continue;
    const end = declarationEnd(visible, match.index!, match[1]);
    if (end >= 0) {
      until = end;
      continue;
    }
    if (!['begin', 'end'].includes(match[1])) continue;
    const arg = skipSpace(visible, match.index! + match[0].length);
    const close = matchingVisibleBrace(visible, arg);
    if (close < 0) continue;
    const name = visible.slice(arg + 1, close).trim();
    if (!names.includes(name)) continue;
    if (match[1] === 'begin') stack.push({ name, start: match.index!, bodyStart: close + 1 });
    else {
      const opened = stack.pop();
      if (!opened || opened.name !== name) throw new Error(`Môi trường ${name} đóng không khớp.`);
      if (!stack.length) result.push({ ...opened, bodyEnd: match.index!, end: close + 1 });
    }
  }
  if (stack.length) throw new Error(`Môi trường ${stack.at(-1)!.name} thiếu \\end.`);
  return result;
}

// Only top-level drawing declarations are inherited by subsequent questions.
// Document classes, input files and question bodies are not copied into a standalone figure.
export function drawingPreamble(source: string): string {
  const visible = maskTexComments(source);
  const declarations: string[] = [];
  let depth = 0,
    cursor = 0,
    environments = 0;
  for (const match of texCommands(source)) {
    if (match.index! < cursor) continue;
    for (let i = cursor; i < match.index!; i++) {
      if (visible[i] === '{') depth++;
      if (visible[i] === '}') depth--;
    }
    const end = declarationEnd(visible, match.index!, match[1]);
    if (end >= 0) {
      if (!depth && !environments) declarations.push(source.slice(match.index!, end));
      cursor = end;
    } else if (['begin', 'end'].includes(match[1])) {
      const arg = skipSpace(visible, match.index! + match[0].length);
      const close = matchingVisibleBrace(visible, arg);
      if (close >= 0) {
        if (visible.slice(arg + 1, close).trim() !== 'document')
          environments += match[1] === 'begin' ? 1 : -1;
        cursor = close + 1;
      } else cursor = match.index! + match[0].length;
    } else {
      if (match[1] === 'begingroup') depth++;
      if (match[1] === 'endgroup') depth--;
      cursor = match.index! + match[0].length;
    }
  }
  return declarations.join('\n');
}
