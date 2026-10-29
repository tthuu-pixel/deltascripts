import type { Question } from '../src/types';
import { questionEnvironment } from './questionEnvironment';
import { environmentRanges } from './texSyntax';
import { extractSolution } from './texParser';

export interface TopicRestoreInfo {
  topicId: string;
  questionId: string;
  revision: string;
}
export interface TopicRestoreItem {
  id: string;
  topicId: string;
  revision: string;
  raw: string;
  latexPreamble: string;
}
const environments = ['bt', 'ex', 'vd', 'bai', 'cau', 'problem', 'question'];
const validId = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const headerPrefix = '% DELTASCRIPT-EXPORT: ';
const questionPrefix = '% DELTASCRIPT-QUESTION: ';
export async function questionSourceRevision(
  q: Pick<Question, 'sourceType' | 'statementRaw' | 'solutionRaw' | 'raw' | 'latexPreamble'>,
) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(
      JSON.stringify([
        q.sourceType,
        q.statementRaw,
        q.solutionRaw || '',
        q.raw || '',
        q.latexPreamble || '',
      ]),
    ),
  );
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export function topicTexFileName(title: string) {
  const name =
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'chuyen-de';
  return `${name}.deltascript.tex`;
}
export async function buildTopicTexArchive(
  topic: { id: string; title: string },
  questions: Question[],
) {
  if (!validId(topic.id) || !questions.length)
    throw new Error('Chuyên đề chưa có câu hỏi để tải xuống.');
  if (new Set(questions.map((q) => q.id)).size !== questions.length)
    throw new Error('Danh sách câu hỏi bị trùng. Hãy tải lại.');
  const lines = [
    headerPrefix + JSON.stringify({ version: 1, topicId: topic.id, title: topic.title }),
    '% Nguồn gồm cả câu nháp và câu đã xuất bản; giữ nguyên các dòng DELTASCRIPT để nhập lại đúng câu gốc.',
    '% Khai báo hình được đặt riêng trong từng nhóm để các câu không ghi đè macro của nhau.',
    '',
  ];
  for (const q of questions) {
    if (q.sourceType !== 'tex')
      throw new Error(
        `Câu “${q.label}” có nguồn Word/HTML. Cần chuyển câu này sang TeX trước khi xuất chung.`,
      );
    if (!validId(q.id) || !q.topicIds?.includes(topic.id))
      throw new Error('Có câu vừa chuyển chuyên đề. Hãy tải lại danh sách.');
    const env = questionEnvironment(q) || 'bt';
    if (!environments.includes(env))
      throw new Error(`Môi trường của “${q.label}” chưa được hỗ trợ xuất TeX.`);
    lines.push(
      questionPrefix +
        JSON.stringify({
          id: q.id,
          revision: await questionSourceRevision(q),
          label: q.label,
          number: q.number,
        }),
      '\\begingroup',
      q.latexPreamble || '',
      `\\begin{${env}}`,
      q.statementRaw,
      '\\loigiai{',
      q.solutionRaw || '',
      '}',
      `\\end{${env}}`,
      '\\endgroup',
      '',
    );
  }
  return lines.join('\n');
}
export function isTopicTexArchive(source: string, fileName = '') {
  return (
    /\.deltascript\.tex$/i.test(fileName) ||
    /^[ \t]*%[ \t]*DELTASCRIPT-(?:EXPORT|QUESTION):/m.test(source.replace(/^\uFEFF/, ''))
  );
}
export function parseArchivedQuestion(raw: string) {
  const ranges = environmentRanges(raw, environments);
  if (
    ranges.length !== 1 ||
    raw.slice(0, ranges[0].start).trim() ||
    raw.slice(ranges[0].end).trim()
  )
    throw new Error('Mỗi mã định danh phải đi kèm đúng một câu hỏi.');
  const r = ranges[0];
  const { statement, solution } = extractSolution(raw.slice(r.bodyStart, r.bodyEnd));
  if (!statement.trim()) throw new Error('Đề bài trong file trống.');
  return {
    statementRaw: statement,
    solutionRaw: solution,
    exerciseEnvironment: r.name,
    raw: raw.slice(r.start, r.end),
  };
}
export function parseTopicTexArchive(input: string): Question[] {
  const source = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const headers = [...source.matchAll(/^[ \t]*%[ \t]*DELTASCRIPT-EXPORT:[ \t]*(.+)$/gm)];
  if (headers.length !== 1)
    throw new Error(
      'Thiếu hoặc trùng dòng DELTASCRIPT-EXPORT. Giữ các dòng định danh khi chuẩn hóa file tải xuống.',
    );
  let header: any;
  try {
    header = JSON.parse(headers[0][1]);
  } catch {
    throw new Error('Dòng DELTASCRIPT-EXPORT không hợp lệ.');
  }
  if (header.version !== 1 || !validId(header.topicId))
    throw new Error('Thông tin chuyên đề trong file không hợp lệ.');
  const markers = [...source.matchAll(/^[ \t]*%[ \t]*DELTASCRIPT-QUESTION:[ \t]*(.+)$/gm)];
  const ranges = environmentRanges(source, environments);
  if (!markers.length || markers.length !== ranges.length || ranges[0].start < markers[0].index!)
    throw new Error(
      'Thiếu mã định danh của một số câu. Giữ các dòng DELTASCRIPT-QUESTION để tránh nhập trùng.',
    );
  const seen = new Set<string>();
  return markers.map((marker, index) => {
    let meta: any;
    try {
      meta = JSON.parse(marker[1]);
    } catch {
      throw new Error('Mã định danh câu hỏi không hợp lệ.');
    }
    if (
      !validId(meta.id) ||
      typeof meta.revision !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(meta.revision) ||
      seen.has(meta.id)
    )
      throw new Error('Mã câu hỏi thiếu, sai hoặc trùng trong file.');
    seen.add(meta.id);
    const segment = source.slice(
      marker.index! + marker[0].length,
      markers[index + 1]?.index ?? source.length,
    );
    const blocks = environmentRanges(segment, environments);
    if (blocks.length !== 1) throw new Error('Mỗi mã định danh phải đi kèm đúng một câu hỏi.');
    const block = blocks[0];
    const latexPreamble = segment
      .slice(0, block.start)
      .replace(/^\s*\\begingroup[ \t]*(?:\n)?/, '')
      .replace(/\n$/, '');
    if (!/^\s*(?:\\endgroup\s*)?$/.test(segment.slice(block.end)))
      throw new Error(
        'Có nội dung ngoài câu hỏi chưa được nhận dạng; giữ cấu trúc nhóm của file tải xuống.',
      );
    return {
      id: crypto.randomUUID(),
      label: typeof meta.label === 'string' ? meta.label : 'Bài tập',
      number: Number.isInteger(meta.number) ? meta.number : 1,
      sourceType: 'tex',
      latexPreamble,
      ...parseArchivedQuestion(segment.slice(block.start, block.end)),
      topicRestore: { topicId: header.topicId, questionId: meta.id, revision: meta.revision },
    };
  });
}
