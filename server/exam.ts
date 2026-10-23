import type { Database } from './database';
import { publicQuestion, questionSelect } from './database';
import { HttpError, requireValue } from './errors';
import { validateTopicIds, validateTopicsExist } from './content';
import { emptyExamSlots, type ExamSettings, type ExamSlot } from '../shared/exam';

async function readSettings(db: Database): Promise<ExamSettings> {
  const row = await db
    .prepare('SELECT content,version FROM exam_settings WHERE id=1')
    .first<{ content: string; version: number }>();
  const slots: ExamSlot[] = JSON.parse(row?.content || '[]');
  return { version: row?.version || 1, slots: slots.length ? slots : emptyExamSlots() };
}
function validateSettings(value: any): ExamSettings {
  requireValue(
    value && Number.isInteger(value.version) && value.version >= 1,
    'Phiên bản cấu hình tạo đề không hợp lệ.',
  );
  requireValue(
    Array.isArray(value.slots) &&
      value.slots.length === 7 &&
      value.slots.every((slot: any, index: number) => slot?.position === index + 1),
    'Cấu hình cần đủ bảy vị trí Câu 1 đến Câu 7 theo thứ tự.',
  );
  return {
    version: value.version,
    slots: value.slots.map((slot: any) => {
      requireValue(
        typeof slot.description === 'string' && slot.description.length <= 500,
        `Mô tả Câu ${slot.position} tối đa 500 ký tự.`,
      );
      validateTopicIds(slot.topicIds);
      return {
        position: slot.position,
        description: slot.description.trim(),
        topicIds: slot.topicIds,
      };
    }),
  };
}
// Count/draw only published sources in published topics. DISTINCT removes duplicate memberships.
function eligible(slot: ExamSlot) {
  return `FROM question_topics qt JOIN topics t ON t.id=qt.topic_id
    JOIN questions q ON q.id=qt.question_id
    WHERE qt.topic_id IN (${slot.topicIds.map(() => '?').join(',')})
    AND t.published=1 AND q.active=1 AND q.published=1`;
}
export async function examSettingsRoute(db: Database, method: string, body: any) {
  if (method === 'POST') {
    const value = validateSettings(body.settings);
    await validateTopicsExist(
      db,
      value.slots.flatMap((slot) => slot.topicIds),
    );
    const result = await db
      .prepare('UPDATE exam_settings SET content=?,version=version+1 WHERE id=1 AND version=?')
      .bind(JSON.stringify(value.slots), value.version)
      .run();
    requireValue(
      result.meta.changes === 1,
      'Cấu hình tạo đề đã thay đổi. Hãy tải lại trước khi lưu.',
      409,
    );
  } else if (method !== 'GET') throw new HttpError(405, 'Phương thức không được hỗ trợ.');
  const settings = await readSettings(db);
  const counts = await Promise.all(
    settings.slots.map(async (slot) =>
      slot.topicIds.length
        ? (await db
            .prepare(`SELECT count(DISTINCT q.id) AS n ${eligible(slot)}`)
            .bind(...slot.topicIds)
            .first<{ n: number }>())!.n
        : 0,
    ),
  );
  return { settings, counts };
}

// Augmenting paths avoid greedy failures when the same question fits several positions.
export function matchExamCandidates(candidates: string[][]): string[] | null {
  const owner = new Map<string, number>();
  const assigned: string[] = [];
  function assign(slot: number, seen: Set<string>): boolean {
    for (const id of candidates[slot]) {
      if (seen.has(id)) continue;
      seen.add(id);
      const previous = owner.get(id);
      if (previous === undefined || assign(previous, seen)) {
        owner.set(id, slot);
        assigned[slot] = id;
        return true;
      }
    }
    return false;
  }
  for (let slot = 0; slot < candidates.length; slot++) if (!assign(slot, new Set())) return null;
  return assigned;
}
export async function generateExam(db: Database) {
  const { slots } = await readSettings(db);
  const missing = slots.filter((slot) => !slot.topicIds.length);
  requireValue(
    !missing.length,
    `Quản trị viên chưa chọn chuyên đề cho Câu ${missing.map((slot) => slot.position).join(', ')}.`,
    422,
  );
  // Seven distinct random options per position suffice for a seven-position matching:
  // any truncated set still has >=7 choices, so it cannot create a Hall-condition failure.
  const draws = await db.batch<Record<string, unknown>>(
    slots.map((slot) =>
      db
        .prepare(`SELECT DISTINCT q.id ${eligible(slot)} ORDER BY random() LIMIT 7`)
        .bind(...slot.topicIds),
    ),
  );
  const empty = slots.filter((_, index) => !draws[index].results.length);
  requireValue(
    !empty.length,
    `Chưa có câu hỏi đủ điều kiện cho Câu ${empty.map((slot) => slot.position).join(', ')}. Cần xuất bản câu hỏi và chuyên đề đã chọn.`,
    422,
  );
  const ids = matchExamCandidates(draws.map((draw) => draw.results.map((row) => row.id as string)));
  requireValue(
    ids,
    'Các chuyên đề được chọn chưa đủ 7 câu hỏi khác nhau để ghép đề. Hãy bổ sung câu hỏi hoặc điều chỉnh cấu hình tạo đề.',
    422,
  );
  // Recheck visibility and membership when reading the source, including concurrent admin edits.
  const result = await db.batch<Record<string, unknown>>(
    slots.map((slot, index) =>
      db
        .prepare(
          `SELECT ${questionSelect} FROM questions q WHERE q.id=? AND q.active=1 AND q.published=1
     AND EXISTS(SELECT 1 FROM question_topics qt JOIN topics t ON t.id=qt.topic_id
       WHERE qt.question_id=q.id AND t.published=1 AND qt.topic_id IN (${slot.topicIds.map(() => '?').join(',')}))`,
        )
        .bind(ids[index], ...slot.topicIds),
    ),
  );
  requireValue(
    result.every((row) => row.results.length === 1),
    'Kho câu hỏi vừa thay đổi trong lúc tạo đề. Vui lòng tạo lại đề.',
    409,
  );
  return result.map((row, index) => ({
    ...publicQuestion(row.results[0]),
    examDescription: slots[index].description,
  }));
}
