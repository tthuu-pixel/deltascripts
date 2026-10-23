import type { Database, Statement } from './database';
import { requireValue } from './errors';
import { membershipStatements, validateTopicIds } from './content';
const text = (value: unknown, max = 200) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const placeholders = (length: number) => Array.from({ length }, () => '?').join(',');
export function validateQuestion(q: any): unknown[] {
  requireValue(
    q &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q.id || ''),
    'ID câu hỏi không hợp lệ.',
  );
  requireValue(['word', 'tex'].includes(q.sourceType), 'Nguồn câu hỏi phải là Word hoặc TeX.');
  requireValue(
    q.published === undefined || typeof q.published === 'boolean',
    'Trạng thái xuất bản không hợp lệ.',
  );
  if (q.topicIds !== undefined) validateTopicIds(q.topicIds);
  requireValue(typeof q.statementRaw === 'string' && q.statementRaw.trim(), 'Đề bài trống.');
  for (const key of ['statementRaw', 'solutionRaw', 'raw', 'latexPreamble'])
    requireValue(
      typeof (q[key] ?? '') === 'string' && (q[key] || '').length <= 1_000_000,
      'Nội dung TeX quá dài hoặc không hợp lệ.',
    );
  requireValue(
    new TextEncoder().encode([q.statementRaw, q.solutionRaw, q.raw, q.latexPreamble].join(''))
      .length <= 1_500_000,
    'Câu hỏi vượt 1,5 MB. Hãy rút gọn nguồn hoặc nén ảnh.',
  );
  return [
    q.id,
    text(q.label) || 'Bài tập',
    // Compatibility column for old storage; no classification or exam logic uses it.
    Number.isInteger(q.number) && q.number >= 1 && q.number <= 7 ? q.number : 1,
    q.sourceType,
    q.statementRaw,
    q.solutionRaw || '',
    q.raw || '',
    q.latexPreamble || '',
    q.published === false ? 0 : 1,
  ];
}
export function questionStatements(db: Database, questions: any[]): Statement[] {
  const rows = [...new Map(questions.map(validateQuestion).map((row) => [row[0], row])).values()];
  const statements: Statement[] = [];
  for (const q of questions) {
    if (q.originalRaw)
      statements.push(
        db
          .prepare(
            `INSERT INTO question_revisions(id,question_id,snapshot,reason)
      SELECT ?,id,json_object('id',id,'label',label,'number',number,'sourceType',source_type,'statementRaw',statement_raw,'solutionRaw',solution_raw,'raw',raw,'latexPreamble',latex_preamble,'published',json(CASE published WHEN 1 THEN 'true' ELSE 'false' END),'topicIds',json((SELECT json_group_array(topic_id) FROM question_topics WHERE question_id=questions.id))),'Trước khi áp dụng bản AI/chuẩn hóa'
      FROM questions WHERE id=? AND (statement_raw!=? OR solution_raw!=? OR raw!=?)`,
          )
          .bind(crypto.randomUUID(), q.id, q.statementRaw, q.solutionRaw || '', q.raw || ''),
      );
  }
  // D1 allows 100 bound parameters per statement; each group uses at most 99.
  for (let i = 0; i < rows.length; i += 11) {
    const group = rows.slice(i, i + 11);
    statements.push(
      db
        .prepare(
          `INSERT INTO questions(id,label,number,source_type,statement_raw,solution_raw,raw,latex_preamble,published)
      VALUES ${group.map(() => `(${placeholders(9)})`).join(',')}
      ON CONFLICT(id) DO UPDATE SET label=excluded.label,
      slot=CASE WHEN questions.number!=excluded.number THEN NULL ELSE questions.slot END,
      number=excluded.number,source_type=excluded.source_type,statement_raw=excluded.statement_raw,
      solution_raw=excluded.solution_raw,raw=excluded.raw,latex_preamble=excluded.latex_preamble,published=excluded.published,active=1`,
        )
        .bind(...group.flat()),
    );
  }
  const assigned = [...new Map(questions.map((q) => [q.id, q])).values()].filter(
    (q) => q.topicIds !== undefined,
  );
  statements.push(
    ...membershipStatements(
      db,
      assigned.map((q) => ({ id: q.id, topicIds: q.topicIds })),
      'replace',
    ),
  );
  for (const q of questions) {
    if (typeof q.originalRaw === 'string' && q.originalRaw && q.originalRaw !== q.raw) {
      requireValue(q.originalRaw.length <= 1_000_000, 'Nguồn ban đầu quá dài.');
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO question_revisions(id,question_id,snapshot,reason) VALUES(?,?,?,'Nguồn nhập ban đầu')`,
          )
          .bind(
            q.id + ':import',
            q.id,
            JSON.stringify({ ...q, raw: q.originalRaw, originalRaw: undefined }),
          ),
      );
    }
  }
  return statements;
}
export async function upsertQuestions(db: Database, questions: any[]) {
  const statements = questionStatements(db, questions);
  if (statements.length) await db.batch(statements);
}
