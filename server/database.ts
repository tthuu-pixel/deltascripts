import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
export type Database = Pick<D1Database, 'prepare' | 'batch' | 'exec'>;
export type Statement = D1PreparedStatement;
export const questionSelect = `q.id,q.label,q.number,q.source_type AS sourceType,
  q.statement_raw AS statementRaw,q.solution_raw AS solutionRaw,q.raw,
  q.latex_preamble AS latexPreamble,q.created_at AS createdAt,q.active,q.published`;
export const randomQuestionSql = (single: boolean) => `
  WITH draw AS MATERIALIZED (
    SELECT number,abs(random() % total) AS slot FROM question_counts
    WHERE total>0 ${single ? 'AND number=?' : ''}
  )
  SELECT ${questionSelect} FROM draw d CROSS JOIN questions q INDEXED BY questions_slot
    WHERE q.active=1 AND q.published=1 AND q.number=d.number AND q.slot=d.slot ORDER BY d.number`;
export async function query(db: Database, sql: string, params: unknown[] = []) {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .all();
  return { rows: result.results, meta: result.meta };
}
export const publicQuestion = (row: Record<string, unknown>) => ({
  ...row,
  active: row.active === 1,
  published: row.published === 1,
});
