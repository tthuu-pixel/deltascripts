import { readFileSync } from 'node:fs';
import { topicIcons, type TopicIcon } from '../shared/content';

export interface CurriculumTopic {
  code: string;
  title: string;
  category: string;
  icon: TopicIcon;
  description: string;
  knowledge: string[];
  steps: string[];
  caution: string;
  examples: { title: string; question: string; solution: string }[];
  types: {
    code: string;
    title: string;
    recognition: string;
    method: string;
    variants?: string[];
  }[];
}
const oldId = (n: number) => `6d3c6200-28f6-4b7c-91a0-${String(n).padStart(12, '0')}`;
const newId = (n: number) => `d7102026-1023-4ca7-91a0-${String(n).padStart(12, '0')}`;
const singleEquationId = '8bb75f4b-224d-437e-98c2-fe9fcc0cbb27';
const tangentId = '8aa1c9e5-9660-43eb-a3f9-c3a2ddfd7681';
export const curriculumIds = [
  oldId(8),
  newId(2),
  oldId(15),
  oldId(1),
  oldId(7),
  newId(6),
  oldId(4),
  oldId(5),
  oldId(6),
  oldId(14),
  oldId(11),
  newId(12),
  tangentId,
  newId(14),
];
export const retiredTopicTargets: Record<string, string> = {
  [oldId(2)]: oldId(1),
  [singleEquationId]: oldId(1),
  [oldId(16)]: oldId(15),
  [oldId(17)]: oldId(15),
  [oldId(18)]: oldId(15),
  [oldId(13)]: oldId(14),
  [oldId(9)]: oldId(11),
  [oldId(10)]: oldId(11),
  [oldId(12)]: oldId(11),
};
export const curriculumSource = JSON.parse(
  readFileSync(new URL('../content/ts10-topics.json', import.meta.url), 'utf8'),
) as CurriculumTopic[];
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const p = (s: string) => `<p>${escapeHtml(s)}</p>`;
const list = (items: string[], tag = 'ul') =>
  `<${tag}>${items.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</${tag}>`;
export const curriculumTopics = curriculumSource.map((t, position) => ({
  id: curriculumIds[position],
  title: t.title,
  category: t.category,
  description: t.description,
  icon: t.icon,
  color: ['blue', 'red', 'yellow'][position % 3],
  position,
  published: 1,
  preamble: '',
  examples_preamble: '',
  theory: `<article class="topic-curriculum"><header class="curriculum-intro"><span class="curriculum-code">${t.code} · ${t.types.length} dạng bài</span><h3>Kiến thức cần nhớ</h3>${list(t.knowledge)}</header><section class="curriculum-method"><h3>Cách tiếp cận</h3>${list(t.steps, 'ol')}</section><aside class="curriculum-caution"><strong>Tránh nhầm lẫn</strong>${p(t.caution)}</aside><section class="curriculum-types"><h3>Các dạng bài trong chuyên đề</h3>${p('Chọn một dạng bài để xem dấu hiệu và hướng giải.')}<div>${t.types.map((type) => `<details class="curriculum-type"><summary><span class="curriculum-code">${type.code}</span> ${escapeHtml(type.title)}</summary><div class="curriculum-type-body"><h4>Nhận biết</h4>${p(type.recognition)}<h4>Hướng giải</h4>${p(type.method)}${type.variants?.length ? `<h4>Biến thể thường gặp</h4>${list(type.variants)}` : ''}</div></details>`).join('')}</div></section></article>`,
  examples: `<article class="topic-curriculum curriculum-examples">${p('Đọc đề, tự thử trước rồi mở lời giải để đối chiếu từng bước. Các ví dụ dưới đây minh họa phương pháp; bài tập vận dụng lấy từ ngân hàng câu hỏi đã xuất bản.')} ${t.examples.map((ex, i) => `<section class="curriculum-example"><span class="curriculum-code">Ví dụ ${i + 1}</span><h3>${escapeHtml(ex.title)}</h3>${p(ex.question)}<details class="curriculum-solution"><summary>Xem lời giải</summary>${p(ex.solution)}</details></section>`).join('')}</article>`,
}));
export function validateCurriculum() {
  if (
    curriculumSource.length !== 14 ||
    curriculumSource.reduce((n, t) => n + t.types.length, 0) !== 112
  )
    throw new Error('Danh mục phải có 14 chuyên đề và 112 dạng.');
  for (const t of curriculumTopics) {
    if (
      !t.id ||
      !topicIcons.includes(t.icon) ||
      t.title.length > 160 ||
      t.description.length > 500 ||
      !t.theory ||
      !t.examples
    )
      throw new Error(`Nội dung không hợp lệ: ${t.title}`);
  }
}

type Row = Record<string, unknown>;
export type ExecuteCurriculum = (
  sql: string,
  params: unknown[],
) => Promise<{ results: Row[]; meta: { changes: number } }>;
export async function curriculumSnapshot(execute: ExecuteCurriculum) {
  // Sequential reads keep the Cloudflare connection count small. Writes below use version guards.
  const topics = (await execute('SELECT * FROM topics ORDER BY id', [])).results;
  const links = (await execute('SELECT * FROM question_topics ORDER BY question_id,topic_id', []))
    .results;
  const exam = (await execute('SELECT * FROM exam_settings WHERE id=1', [])).results[0];
  return { topics, links, exam };
}
const fields = [
  'title',
  'category',
  'description',
  'theory',
  'preamble',
  'examples',
  'examples_preamble',
  'icon',
  'color',
  'position',
  'published',
] as const;
function matches(row: Row | undefined, target: (typeof curriculumTopics)[number] | undefined) {
  return row && target && fields.every((f) => row[f] === target[f]);
}
export function remapExamContent(content: string) {
  const slots = JSON.parse(content);
  if (!Array.isArray(slots)) throw new Error('Cấu hình tạo đề không hợp lệ.');
  return JSON.stringify(
    slots.map((slot) => ({
      ...slot,
      topicIds: Array.isArray(slot.topicIds)
        ? [...new Set(slot.topicIds.map((id: string) => retiredTopicTargets[id] || id))]
        : [],
    })),
  );
}
export async function rewriteCurriculum(execute: ExecuteCurriculum, apply = false) {
  validateCurriculum();
  const before = await curriculumSnapshot(execute);
  const known = new Set([...curriculumIds, ...Object.keys(retiredTopicTargets)]);
  if (before.topics.some((t) => !known.has(String(t.id))))
    throw new Error(
      'Có chuyên đề ngoài kế hoạch. Cần đối chiếu trước khi viết lại để tránh mất nội dung.',
    );
  if (!before.exam) throw new Error('Chưa có cấu hình tạo đề.');
  const changed = curriculumTopics.filter(
    (t) =>
      !matches(
        before.topics.find((row) => row.id === t.id),
        t,
      ),
  );
  const retired = before.topics.filter((t) => retiredTopicTargets[String(t.id)]);
  const plan = {
    topics: 14,
    types: 112,
    examples: 28,
    updated: changed.filter((t) => before.topics.some((row) => row.id === t.id)).length,
    created: changed.filter((t) => !before.topics.some((row) => row.id === t.id)).length,
    merged: retired.length,
    applied: apply,
  };
  if (!apply) return plan;
  if (changed.length) {
    // A single guarded statement writes the entire authored catalog or none of it.
    const expected = JSON.stringify(before.topics.map((t) => ({ id: t.id, version: t.version })));
    const values = fields.map((f) => `json_extract(j.value,'$.${f}')`).join(',');
    const result = await execute(
      `INSERT INTO topics(id,${fields.join(',')}) SELECT json_extract(j.value,'$.id'),${values} FROM json_each(?) j
      WHERE (SELECT count(*) FROM topics)=(SELECT count(*) FROM json_each(?))
      AND NOT EXISTS(SELECT 1 FROM topics t LEFT JOIN json_each(?) e ON t.id=json_extract(e.value,'$.id') WHERE e.value IS NULL OR t.version!=json_extract(e.value,'$.version'))
      ON CONFLICT(id) DO UPDATE SET ${fields.map((f) => `${f}=excluded.${f}`).join(',')},version=topics.version+1`,
      [JSON.stringify(changed), expected, expected],
    );
    if (result.meta.changes < changed.length)
      throw new Error(
        'Nội dung đã thay đổi trong lúc chuẩn bị. Đã dừng trước khi gộp; chạy lại sau khi đối chiếu.',
      );
  }
  const mapping = JSON.stringify(retiredTopicTargets);
  // Add new memberships before removing old ones, preserving drafts and deduplicating overlaps.
  await execute(
    `INSERT OR IGNORE INTO question_topics(question_id,topic_id) SELECT qt.question_id,m.value FROM question_topics qt JOIN json_each(?) m ON qt.topic_id=m.key`,
    [mapping],
  );
  const currentExam = (await execute('SELECT * FROM exam_settings WHERE id=1', [])).results[0];
  const remapped = remapExamContent(String(currentExam.content));
  if (JSON.stringify(JSON.parse(String(currentExam.content))) !== remapped) {
    const result = await execute(
      'UPDATE exam_settings SET content=?,version=version+1 WHERE id=1 AND version=?',
      [remapped, currentExam.version],
    );
    if (result.meta.changes !== 1)
      throw new Error(
        'Cấu hình tạo đề vừa thay đổi. Đã giữ chuyên đề cũ, cần chạy lại để gộp tiếp.',
      );
  }
  const targetRows = (await execute('SELECT * FROM topics ORDER BY id', [])).results;
  if (
    curriculumTopics.some(
      (t) =>
        !matches(
          targetRows.find((row) => row.id === t.id),
          t,
        ),
    )
  )
    throw new Error('Có chỉnh sửa mới trong lúc gộp; giữ chuyên đề cũ để đối chiếu.');
  if (retired.length) {
    const result = await execute(
      `DELETE FROM topics WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?))
      AND NOT EXISTS(SELECT 1 FROM topics t JOIN json_each(?) e ON t.id=json_extract(e.value,'$.id') WHERE t.version!=json_extract(e.value,'$.version'))
      AND NOT EXISTS(SELECT 1 FROM question_topics old JOIN json_each(?) m ON old.topic_id=m.key WHERE NOT EXISTS(SELECT 1 FROM question_topics n WHERE n.question_id=old.question_id AND n.topic_id=m.value))
      AND NOT EXISTS(SELECT 1 FROM exam_settings e,json_tree(e.content) j JOIN json_each(?) m ON j.type='text' AND j.value=m.key)`,
      [
        JSON.stringify(retired.map((t) => ({ id: t.id, version: t.version }))),
        JSON.stringify(retired.map((t) => ({ id: t.id, version: t.version }))),
        mapping,
        mapping,
      ],
    );
    // D1 changes may include cascade/trigger writes, so verify the actual final rows below.
    if (!result.meta.changes)
      throw new Error(
        'Dữ liệu vừa thay đổi; giữ chuyên đề cũ thay vì xóa khi chưa chuyển đủ liên kết.',
      );
  }
  const after = await curriculumSnapshot(execute);
  if (
    after.topics.length !== 14 ||
    after.topics.some(
      (t) =>
        !matches(
          t,
          curriculumTopics.find((target) => target.id === t.id)!,
        ),
    )
  )
    throw new Error('Danh mục sau cập nhật chưa khớp. Kiểm tra bản sao lưu.');
  const expectedLinks = new Set(
    before.links.map(
      (l) => `${l.question_id}:${retiredTopicTargets[String(l.topic_id)] || l.topic_id}`,
    ),
  );
  const actualLinks = new Set(after.links.map((l) => `${l.question_id}:${l.topic_id}`));
  if ([...expectedLinks].some((key) => !actualLinks.has(key)))
    throw new Error('Có liên kết câu hỏi cần đối chiếu bản sao lưu.');
  return plan;
}
