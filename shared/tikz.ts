import {
  declarationEnd,
  environmentRanges,
  matchingVisibleBrace,
  groupEnd,
  maskTexComments,
  skipSpace,
  type TexRange,
} from './texSyntax.ts';

export interface TikzBlock extends TexRange {
  source: string;
}
export interface DrawingDeclaration extends TexRange {
  source: string;
}

export function extractTikz(
  source: string,
  preamble = '',
): {
  blocks: TikzBlock[];
  declarations: DrawingDeclaration[];
} {
  const visible = maskTexComments(source);
  const pictures = environmentRanges(source, ['tikzpicture']);
  const blocks: TikzBlock[] = [];
  const declarations: DrawingDeclaration[] = [];
  const scopes: { name: string; declarations: string[] }[] = [{ name: '', declarations: [] }];
  for (let i = 0; i < visible.length;) {
    if (visible[i] === '{') {
      scopes.push({ name: '{', declarations: [] });
      i++;
      continue;
    }
    if (visible[i] === '}') {
      if (scopes.length > 1) scopes.pop();
      i++;
      continue;
    }
    if (visible[i] !== '\\') {
      i++;
      continue;
    }
    const command = /^\\([a-zA-Z@]+|[^a-zA-Z@])/.exec(visible.slice(i));
    if (!command) {
      i++;
      continue;
    }
    let end = declarationEnd(visible, i, command[1]);
    if (end >= 0) {
      const definition = source.slice(i, end);
      (/^(?:gdef|xdef)$/.test(command[1]) ? scopes[0] : scopes.at(-1))!.declarations.push(
        definition,
      );
      declarations.push({ start: i, end, source: definition });
      i = end;
      continue;
    }
    const picture = pictures.find((p) => p.start === i);
    if (picture) end = picture.end;
    else if (command[1] === 'tikz') {
      let arg = skipSpace(visible, i + command[0].length);
      if (visible[arg] === '[') {
        const optionEnd = groupEnd(visible, arg);
        if (optionEnd < 0) throw new Error('TikZ thiếu dấu ] đóng tùy chọn.');
        arg = skipSpace(visible, optionEnd + 1);
      }
      end = matchingVisibleBrace(visible, arg);
      if (end < 0) throw new Error('Dùng \\tikz{...} với đầy đủ ngoặc để nhập hình nội dòng.');
      end++;
    }
    if (end > i) {
      blocks.push({
        start: i,
        end,
        source: [preamble, ...scopes.flatMap((s) => s.declarations), source.slice(i, end)]
          .filter(Boolean)
          .join('\n'),
      });
      i = end;
    } else if (['begin', 'end'].includes(command[1])) {
      const arg = skipSpace(visible, i + command[0].length);
      const close = matchingVisibleBrace(visible, arg);
      if (close < 0) {
        i += command[0].length;
        continue;
      }
      const name = visible.slice(arg + 1, close).trim();
      if (command[1] === 'begin') scopes.push({ name, declarations: [] });
      else if (scopes.at(-1)?.name === name && scopes.length > 1) scopes.pop();
      i = close + 1;
    } else i += command[0].length;
  }
  return { blocks, declarations };
}

export function validateTikz(source: string): void {
  const visible = maskTexComments(source);
  const braces: number[] = [];
  const environments: string[] = [];
  for (let i = 0; i < visible.length; i++) {
    if (visible[i] === '\\') {
      const command = /^\\([a-zA-Z@]+|[^a-zA-Z@])/.exec(visible.slice(i));
      if (!command) continue;
      if (['begin', 'end'].includes(command[1])) {
        const arg = skipSpace(visible, i + command[0].length);
        const end = matchingVisibleBrace(visible, arg);
        if (end < 0) throw new Error('TikZ thiếu ngoặc trong tên môi trường.');
        const name = visible.slice(arg + 1, end).trim();
        if (command[1] === 'begin') environments.push(name);
        else if (environments.pop() !== name)
          throw new Error(`TikZ đóng môi trường ${name} không khớp.`);
      }
      i += command[0].length - 1;
    } else if (visible[i] === '{') braces.push(i);
    else if (visible[i] === '}' && braces.pop() === undefined)
      throw new Error(`TikZ thừa dấu } ở dòng ${visible.slice(0, i).split('\n').length}.`);
  }
  if (braces.length) throw new Error('TikZ thiếu dấu ngoặc đóng }.');
  if (environments.length) throw new Error(`TikZ thiếu \\end{${environments.at(-1)}}.`);
}

export function buildTikzDocument(source: string): string {
  validateTikz(source);
  // New drawings follow the supplied skill: pure TikZ. Legacy sources are kept
  // verbatim and load their older packages only when their commands are present.
  const visible = maskTexComments(source);
  let headerEnd = 0;
  for (;;) {
    const start = skipSpace(visible, headerEnd);
    const command = /^\\([a-zA-Z@]+)/.exec(visible.slice(start));
    if (!command) break;
    const end = declarationEnd(visible, start, command[1]);
    if (end < 0) break;
    headerEnd = end;
  }
  const legacy = [
    /\\tkz[A-Za-z]+/.test(visible) ? 'tkz-euclide' : '',
    /\\(?:begin\s*\{(?:axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|groupplot)\}|addplot\b|pgfplotsset\b)/.test(
      visible,
    )
      ? 'pgfplots'
      : '',
  ].filter(Boolean);
  return String.raw`\documentclass[tikz,border=2pt]{standalone}
\usepackage[utf8]{inputenc}
\usepackage[T5]{fontenc}
\usepackage{amsmath,amssymb,mathrsfs}
\usetikzlibrary{calc,angles,quotes,intersections,through,backgrounds,patterns,shapes.geometric,arrows.meta,decorations.markings,decorations.pathreplacing,positioning}
${legacy.length ? `\\usepackage{${legacy.join(',')}}` : ''}
${legacy.includes('pgfplots') ? '\\pgfplotsset{compat=1.18}' : ''}
${source.slice(0, headerEnd)}
\begin{document}
${source.slice(headerEnd)}
\end{document}`;
}
