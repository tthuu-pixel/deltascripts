import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import type { Question } from '../types';
import { escapeHtml } from './texParser';

const children = (node: any): any[] => Array.from(node.childNodes || []);
const local = (node: any) => String(node.localName || node.nodeName || '').replace(/^.*:/, '');
function omml(node: any): string {
  const name = local(node);
  const child = (tag: string) => children(node).find((n) => local(n) === tag);
  const content = (tag: string) => (child(tag) ? omml(child(tag)) : '');
  if (name.endsWith('Pr')) return '';
  if (name === 't') return node.textContent || '';
  if (name === 'f') return `\\frac{${content('num')}}{${content('den')}}`;
  if (name === 'sSup') return `{${content('e')}}^{${content('sup')}}`;
  if (name === 'sSub') return `{${content('e')}}_{${content('sub')}}`;
  if (name === 'sSubSup') return `{${content('e')}}_{${content('sub')}}^{${content('sup')}}`;
  if (name === 'rad')
    return `\\sqrt${content('deg') ? `[${content('deg')}]` : ''}{${content('e')}}`;
  if (name === 'd') {
    const delimiter = (tag: string, fallback: string) => {
      const property = node.getElementsByTagName(`m:${tag}`)[0];
      const value = property ? property.getAttribute('m:val') : fallback;
      return value === '{' ? '\\{' : value === '}' ? '\\}' : value || '.';
    };
    return `\\left${delimiter('begChr', '(')}${children(node)
      .filter((n) => local(n) === 'e')
      .map(omml)
      .join(',')}\\right${delimiter('endChr', ')')}`;
  }
  if (name === 'bar') return `\\overline{${content('e')}}`;
  if (name === 'limLow') return `{${content('e')}}_{${content('lim')}}`;
  if (name === 'limUpp') return `{${content('e')}}^{${content('lim')}}`;
  if (['acc', 'sPre', 'groupChr', 'borderBox'].includes(name))
    throw new Error(
      `Công thức Word (${name}) chưa được hỗ trợ. Hãy xuất câu này sang LaTeX để giữ đúng nội dung.`,
    );
  if (name === 'm')
    return `\\begin{matrix}${children(node)
      .filter((n) => local(n) === 'mr')
      .map(omml)
      .join('\\\\')}\\end{matrix}`;
  if (name === 'mr')
    return children(node)
      .filter((n) => local(n) === 'e')
      .map(omml)
      .join('&');
  if (name === 'eqArr')
    return `\\begin{aligned}${children(node)
      .filter((n) => local(n) === 'e')
      .map(omml)
      .join('\\\\')}\\end{aligned}`;
  if (name === 'nary') {
    const op = node.getElementsByTagName('m:chr')[0]?.getAttribute('m:val') || '∑';
    const symbol =
      ({ '∑': '\\sum', '∏': '\\prod', '∫': '\\int' } as Record<string, string>)[op] || op;
    return `${symbol}_{${content('sub')}}^{${content('sup')}} ${content('e')}`;
  }
  return children(node).map(omml).join('');
}
export async function parseWordFile(file: File): Promise<Question[]> {
  if (file.size > 20 * 1024 * 1024) throw new Error('File Word vượt 20 MB. Hãy chia nhỏ file.');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const expanded = Object.values(zip.files).reduce(
    (sum, entry) => sum + ((entry as any)._data?.uncompressedSize || 0),
    0,
  );
  if (expanded > 60 * 1024 * 1024) throw new Error('File Word giải nén quá lớn.');
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml || xml.length > 8_000_000)
    throw new Error('File không có nội dung Word hợp lệ hoặc quá lớn.');
  const parse = (source: string) => new DOMParser().parseFromString(source, 'application/xml');
  const relationships: Record<string, string> = {};
  const rels = await zip.file('word/_rels/document.xml.rels')?.async('string');
  if (rels)
    for (const rel of Array.from(parse(rels).getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id'),
        target = rel.getAttribute('Target');
      if (id && target && !rel.getAttribute('TargetMode'))
        relationships[id] = target.replace(/^\.\//, '');
    }
  const images: Record<string, string> = {};
  for (const [id, target] of Object.entries(relationships)) {
    if (!target.startsWith('media/')) continue;
    const entry = zip.file(`word/${target}`);
    if (!entry) throw new Error('Không tìm thấy ảnh nhúng trong file Word.');
    if ((entry as any)._data?.uncompressedSize > 400_000)
      throw new Error('Ảnh trong file Word vượt 400 KB. Hãy nén ảnh rồi nhập lại.');
    const ext = target.split('.').pop()?.toLowerCase();
    const mime = (
      { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' } as Record<
        string,
        string
      >
    )[ext || ''];
    if (!mime)
      throw new Error(
        'Ảnh Word cần ở định dạng PNG, JPEG hoặc GIF. Hãy đổi định dạng ảnh rồi nhập lại.',
      );
    images[id] = `data:${mime};base64,${await entry.async('base64')}`;
  }
  function render(node: any): string {
    const name = local(node);
    if (name === 'oMath' || name === 'oMathPara') return escapeHtml(`$${omml(node)}$`);
    if (node.nodeName === 'w:t') return escapeHtml(node.textContent || '');
    if (node.nodeName === 'w:tab') return ' ';
    if (node.nodeName === 'w:br') return '<br/>';
    if (node.nodeName === 'a:blip') {
      const src = images[node.getAttribute('r:embed')];
      if (!src)
        throw new Error(
          'Ảnh Word liên kết bên ngoài chưa được hỗ trợ. Hãy nhúng ảnh vào tài liệu.',
        );
      return `<img src="${src}" alt="Hình từ file Word" loading="lazy"/>`;
    }
    if (node.nodeName === 'w:rPr' || node.nodeName === 'w:pPr' || name.endsWith('Pr')) return '';
    if (node.nodeName === 'w:tbl')
      return `<table><tbody>${children(node).map(render).join('')}</tbody></table>`;
    if (node.nodeName === 'w:tr') return `<tr>${children(node).map(render).join('')}</tr>`;
    if (node.nodeName === 'w:tc') return `<td>${children(node).map(render).join('')}</td>`;
    return children(node).map(render).join('');
  }
  const body = parse(xml).getElementsByTagName('w:body')[0];
  if (!body) throw new Error('Không tìm thấy nội dung trong file Word.');
  const questions: Question[] = [];
  let current: { number: number; statement: string[]; solution: string[]; answer: boolean } | null =
    null;
  const flush = () => {
    if (!current) return;
    questions.push({
      id: crypto.randomUUID(),
      label: `Câu ${current.number}`,
      number: current.number,
      numberOrigin: 'explicit',
      sourceType: 'word',
      statementRaw: current.statement.join('\n'),
      solutionRaw: current.solution.join('\n'),
    });
  };
  for (const node of children(body)) {
    let html = render(node).trim();
    if (!html) continue;
    const label = /^\s*\[?(?:Câu|Bài)\s+(\d+)\]?[.:]?\s*/i.exec(html);
    if (label) {
      flush();
      current = { number: Number(label[1]), statement: [], solution: [], answer: false };
      html = html.slice(label[0].length);
    }
    if (!current) continue; // Ignore document headers before the first question.
    const answer = /^(?:\[?Lời giải\]?|Hướng dẫn giải|Đáp án)\s*:?\s*/i.exec(html);
    if (answer) {
      current.answer = true;
      html = html.slice(answer[0].length);
    }
    if (html)
      (current.answer ? current.solution : current.statement).push(
        node.nodeName === 'w:p' ? `<p>${html}</p>` : html,
      );
  }
  flush();
  if (!questions.length)
    throw new Error(
      'Không nhận diện được câu hỏi. Mỗi câu cần bắt đầu bằng “Câu 1.” hoặc “Bài 1.”.',
    );
  return questions;
}
