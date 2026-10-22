import { normalizeTexContent } from '../parsers/texParser';
import { extractTikz } from '../../shared/tikz';

export function prepareContent(
  raw: string,
  preamble = '',
): {
  html: string;
  tikz: { key: string; source: string }[];
} {
  const tikz: { key: string; source: string }[] = [];
  let source = String(raw || '');
  const extracted = extractTikz(source, preamble);
  const replacements = [
    ...extracted.blocks.map((block, index) => {
      const key = String(index);
      tikz.push({ key, source: block.source });
      return { ...block, replacement: `DSTIKZTOKEN${key}END` };
    }),
    ...extracted.declarations.map((declaration) => ({ ...declaration, replacement: '' })),
  ].sort((a, b) => b.start - a.start);
  for (const range of replacements)
    source = source.slice(0, range.start) + range.replacement + source.slice(range.end);
  const html = normalizeTexContent(source).replace(
    /DSTIKZTOKEN(\d+)END/g,
    (_, key) =>
      `<div data-tikz-id="${key}" class="my-3 text-gray-500" role="status">Đang tải hình TikZ…</div>`,
  );
  return { html, tikz };
}
