import type { Question } from '../src/types';
import type { Database } from './database';
import { requireValue } from './errors';

export async function saveRepairedQuestion(
  db: Database,
  before: Question,
  next: Question,
  reason: string,
) {
  const revisionId = crypto.randomUUID();
  const snapshot = JSON.stringify({ ...before, active: before.active !== false });
  const result = await db.batch([
    db
      .prepare(
        `INSERT INTO question_revisions(id,question_id,snapshot,reason) SELECT ?,id,?,? FROM questions
    WHERE id=? AND active=1 AND statement_raw=? AND solution_raw=? AND raw=? AND latex_preamble=?
    AND (SELECT json_group_array(topic_id) FROM (SELECT topic_id FROM question_topics WHERE question_id=? ORDER BY topic_id))=?`,
      )
      .bind(
        revisionId,
        snapshot,
        reason,
        before.id,
        before.statementRaw,
        before.solutionRaw,
        before.raw || '',
        before.latexPreamble || '',
        before.id,
        JSON.stringify([...(before.topicIds || [])].sort()),
      ),
    db
      .prepare(
        `UPDATE questions SET statement_raw=?,solution_raw=?,raw=? WHERE id=? AND active=1 AND EXISTS(SELECT 1 FROM question_revisions WHERE id=?)`,
      )
      .bind(next.statementRaw, next.solutionRaw, next.raw || '', before.id, revisionId),
    db
      .prepare(
        'DELETE FROM question_topics WHERE question_id=? AND EXISTS(SELECT 1 FROM question_revisions WHERE id=?)',
      )
      .bind(before.id, revisionId),
    db
      .prepare(
        `INSERT INTO question_topics(question_id,topic_id) SELECT ?,value FROM json_each(?) WHERE EXISTS(SELECT 1 FROM question_revisions WHERE id=?)`,
      )
      .bind(before.id, JSON.stringify(next.topicIds || []), revisionId),
  ]);
  requireValue(
    result[1].meta.changes === 1,
    'Câu hỏi vừa thay đổi; hệ thống sẽ đọc bản mới khi thử lại.',
    409,
  );
}
