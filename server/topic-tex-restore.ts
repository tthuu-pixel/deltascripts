import type { Database } from './database';
import { questionSelect } from './database';
import { attachQuestionTopics } from './content';
import { HttpError, requireValue } from './errors';
import { validateQuestion } from './question-storage';
import {
  parseArchivedQuestion,
  questionSourceRevision,
  type TopicRestoreItem,
} from '../shared/topicTexArchive';
import { questionEnvironment } from '../shared/questionEnvironment';
import type { Question } from '../src/types';
const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id);
export async function restoreTopicTex(db: Database, body: any) {
  requireValue(
    Array.isArray(body.items) && body.items.length > 0 && body.items.length <= 10,
    'Mỗi lần cập nhật từ 1 đến 10 câu.',
  );
  const items = body.items as TopicRestoreItem[];
  requireValue(
    new Set(items.map((x) => x?.id)).size === items.length,
    'Một câu bị lặp trong lượt cập nhật.',
  );
  for (const item of items)
    requireValue(
      item &&
        validId(item.id) &&
        validId(item.topicId) &&
        typeof item.revision === 'string' &&
        /^[a-f0-9]{64}$/i.test(item.revision) &&
        typeof item.raw === 'string' &&
        item.raw.length <= 1_000_000 &&
        typeof item.latexPreamble === 'string' &&
        item.latexPreamble.length <= 1_000_000,
      'Nguồn hoặc mã định danh câu hỏi không hợp lệ.',
    );
  const rows = (
    await db
      .prepare(
        `SELECT ${questionSelect} FROM questions q WHERE active=1 AND id IN (${items.map(() => '?').join(',')})`,
      )
      .bind(...items.map((x) => x.id))
      .all()
  ).results;
  requireValue(
    rows.length === items.length,
    'Một số câu đã bị xóa. Tải lại file mới từ chuyên đề; không tự khôi phục câu đã xóa.',
    409,
  );
  const current = (await attachQuestionTopics(db, rows)) as unknown as Question[];
  const changes: { before: Question; next: Question; topicId: string }[] = [];
  let unchanged = 0;
  for (const item of items) {
    const before = current.find((q) => q.id === item.id)!;
    requireValue(
      before.sourceType === 'tex' && before.topicIds?.includes(item.topicId),
      'Câu hỏi không còn thuộc chuyên đề của file. Tải lại file mới.',
      409,
    );
    let parsed: ReturnType<typeof parseArchivedQuestion>;
    try {
      parsed = parseArchivedQuestion(item.raw);
    } catch (error) {
      throw new HttpError(422, (error as Error).message);
    }
    const next: Question = { ...before, ...parsed, latexPreamble: item.latexPreamble };
    validateQuestion(next);
    requireValue(
      !before.solutionRaw.trim() || next.solutionRaw.trim(),
      'Lời giải đang có bị bỏ trống. Giữ lời giải khi chuẩn hóa và nhập lại.',
      422,
    );
    if (
      before.statementRaw === next.statementRaw &&
      before.solutionRaw === next.solutionRaw &&
      (before.latexPreamble || '') === (next.latexPreamble || '') &&
      questionEnvironment(before) === questionEnvironment(next)
    ) {
      unchanged++;
      continue;
    }
    requireValue(
      (await questionSourceRevision(before)) === item.revision,
      'Có câu đã được sửa sau khi tải xuống. Tải lại file mới để tránh ghi đè.',
      409,
    );
    changes.push({ before, next, topicId: item.topicId });
  }
  if (changes.length) {
    try {
      await db.batch(
        changes.flatMap(({ before, next, topicId }) => {
          const revisionId = crypto.randomUUID();
          return [
            db
              .prepare(
                `INSERT INTO question_revisions(id,question_id,snapshot,reason) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM questions WHERE id=? AND active=1 AND statement_raw=? AND solution_raw=? AND raw=? AND latex_preamble=? AND EXISTS(SELECT 1 FROM question_topics WHERE question_id=? AND topic_id=?)) THEN ? ELSE NULL END,?,'Nhập lại file TeX đã chỉnh sửa từ chuyên đề')`,
              )
              .bind(
                revisionId,
                before.id,
                before.statementRaw,
                before.solutionRaw,
                before.raw || '',
                before.latexPreamble || '',
                before.id,
                topicId,
                before.id,
                JSON.stringify(before),
              ),
            db
              .prepare(
                'UPDATE questions SET statement_raw=?,solution_raw=?,raw=?,latex_preamble=? WHERE id=? AND EXISTS(SELECT 1 FROM question_revisions WHERE id=?)',
              )
              .bind(
                next.statementRaw,
                next.solutionRaw,
                next.raw || '',
                next.latexPreamble || '',
                before.id,
                revisionId,
              ),
          ];
        }),
      );
    } catch (error) {
      if (
        /NOT NULL constraint failed: question_revisions\.question_id/i.test(
          (error as Error).message,
        )
      )
        throw new HttpError(
          409,
          'Câu hỏi vừa thay đổi trong lúc nhập. Lượt này chưa được ghi; hãy tải lại file mới.',
        );
      throw error;
    }
  }
  return { updated: changes.length, unchanged };
}
