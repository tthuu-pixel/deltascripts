import { environmentRanges, findMatchingBrace, groupEnd, skipSpace } from './texSyntax';

function argument(source: string, start: number) {
  start = skipSpace(source, start);
  const end = findMatchingBrace(source, start);
  if (end < 0) throw new Error('Khai báo bảng thiếu dấu ngoặc đóng.');
  return { value: source.slice(start + 1, end), end: end + 1 };
}

function splitRows(body: string) {
  const rows: string[][] = [];
  let cells: string[] = [],
    cell = '',
    braces = 0,
    environments = 0;
  const finishCell = () => {
    cells.push(cell.trim());
    cell = '';
  };
  const finishRow = () => {
    finishCell();
    if (cells.length > 1 || cells[0]) rows.push(cells);
    cells = [];
  };
  for (let i = 0; i < body.length;) {
    if (body[i] === '\\') {
      const command = /^\\([a-zA-Z@]+|[\s\S])/.exec(body.slice(i));
      if (!command) {
        cell += body[i++];
        continue;
      }
      const name = command[1];
      if (
        !braces &&
        !environments &&
        ['hline', 'toprule', 'midrule', 'bottomrule', 'cline', 'noalign'].includes(name)
      ) {
        i += command[0].length;
        if (name === 'cline' || name === 'noalign') i = argument(body, i).end;
        continue;
      }
      if (!braces && !environments && (name === '\\' || name === 'tabularnewline')) {
        finishRow();
        i += command[0].length;
        if (body[i] === '*') i++;
        const next = skipSpace(body, i);
        if (body[next] === '[') {
          const end = groupEnd(body, next);
          if (end >= 0) i = end + 1;
        }
        continue;
      }
      if (name === 'begin' || name === 'end') {
        const arg = argument(body, i + command[0].length);
        environments += name === 'begin' ? 1 : -1;
        cell += body.slice(i, arg.end);
        i = arg.end;
        continue;
      }
      cell += name === '&' ? '&amp;' : command[0];
      i += command[0].length;
      continue;
    }
    if (body[i] === '&' && !braces && !environments) {
      finishCell();
      i++;
      continue;
    }
    if (body[i] === '{') braces++;
    if (body[i] === '}') braces--;
    cell += body[i++];
  }
  finishRow();
  return rows;
}

function cellSpan(source: string) {
  let text = source,
    colspan = 1,
    rowspan = 1;
  for (let count = 0; count < 2; count++) {
    const command = /^\\(multicolumn|multirow)\b/.exec(text);
    if (!command) break;
    const a = argument(text, command[0].length);
    const b = argument(text, a.end);
    const c = argument(text, b.end);
    if (!/^\d+$/.test(a.value) || Number(a.value) < 1 || Number(a.value) > 100) break;
    if (command[1] === 'multicolumn') colspan = Number(a.value);
    else rowspan = Number(a.value);
    text = c.value + text.slice(c.end);
  }
  return { text, colspan, rowspan };
}

// Parse complete environments and protect each nested table before looking for
// outer '&' / '\\\\'. A non-greedy regex cannot distinguish the two table levels.
export function renderTexTables(source: string, depth = 0): string {
  if (depth > 30) throw new Error('Bảng lồng quá nhiều cấp.');
  const ranges = environmentRanges(source, ['tabular']);
  let result = source;
  for (const range of ranges.reverse()) {
    let cursor = skipSpace(source, range.bodyStart);
    if (source[cursor] === '[') {
      const end = groupEnd(source, cursor);
      if (end < 0) throw new Error('Tùy chọn bảng thiếu dấu đóng ].');
      cursor = skipSpace(source, end + 1);
    }
    const columns = argument(source, cursor);
    let body = source.slice(columns.end, range.bodyEnd);
    const nested: string[] = [];
    for (const child of environmentRanges(body, ['tabular']).reverse()) {
      const token = `DSNESTEDTABLE${nested.length}END`;
      nested.push(renderTexTables(body.slice(child.start, child.end), depth + 1));
      body = body.slice(0, child.start) + token + body.slice(child.end);
    }
    let occupied = new Map<number, number>();
    const rows = splitRows(body).map((cells) => {
      const carried = occupied;
      occupied = new Map(
        [...carried].filter(([, left]) => left > 1).map(([column, left]) => [column, left - 1]),
      );
      let column = 0;
      const html: string[] = [];
      for (const cell of cells) {
        // A multirow continuation uses an empty '&' placeholder in TeX.
        if (carried.has(column) && !cell) {
          column++;
          continue;
        }
        while (carried.has(column)) column++;
        const span = cellSpan(cell);
        if (span.rowspan > 1)
          for (let offset = 0; offset < span.colspan; offset++)
            occupied.set(column + offset, span.rowspan - 1);
        const attrs =
          (span.colspan > 1 ? ` colspan="${span.colspan}"` : '') +
          (span.rowspan > 1 ? ` rowspan="${span.rowspan}"` : '');
        html.push(`<td${attrs}>${span.text}</td>`);
        column += span.colspan;
      }
      return `<tr>${html.join('')}</tr>`;
    });
    let html = `<table class="tex-table${depth ? ' tex-table-nested' : ''}"><tbody>${rows.join('')}</tbody></table>`;
    html = html.replace(/DSNESTEDTABLE(\d+)END/g, (_, index) => nested[Number(index)]);
    if (!depth) html = `<div class="tex-table-scroll">${html}</div>`;
    result = result.slice(0, range.start) + html + result.slice(range.end);
  }
  return result;
}
