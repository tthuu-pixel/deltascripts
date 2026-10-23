import { sourceEnvironment } from '../shared/questionEnvironment';
import type { Database } from './database';
import { attachQuestionTopics } from './content';
import { HttpError, requireValue } from './errors';

export async function readAiScanPage(db: Database, url: URL) {
  let cutoff = url.searchParams.get('cutoff') || '';
  const cursor = url.searchParams.get('cursor') || '';
  requireValue(
    !cutoff ||
      (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cutoff) &&
        Number.isFinite(Date.parse(cutoff))),
    'Mốc quét không hợp lệ.',
  );
  if (!cutoff)
    cutoff = (await db
      .prepare("SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now') AS now")
      .first<{ now: string }>())!.now;
  let after: [string, string] | null = null;
  if (cursor) {
    try {
      after = JSON.parse(atob(cursor));
    } catch {
      throw new HttpError(400, 'Vị trí quét không hợp lệ.');
    }
    requireValue(
      Array.isArray(after) &&
        after.length === 2 &&
        typeof after[0] === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(after[0]) &&
        after[0] <= cutoff &&
        typeof after[1] === 'string' &&
        /^[a-f0-9-]{36}$/i.test(after[1]),
      'Vị trí quét không hợp lệ.',
    );
  }
  const result = await db
    .prepare(
      `SELECT q.id,q.label,q.number,q.source_type AS sourceType,
    substr(q.statement_raw,1,20001) AS statementRaw,length(q.statement_raw) AS sourceLength,
    q.created_at AS createdAt,q.active,q.published,substr(q.raw,1,2048) AS sourceHeader
    FROM questions q WHERE q.active=1 AND q.created_at<=?
    ${after ? 'AND q.created_at<=? AND (q.created_at<? OR (q.created_at=? AND q.id>?))' : ''}
    ORDER BY q.created_at DESC,q.id LIMIT 51`,
    )
    .bind(cutoff, ...(after ? [after[0], after[0], after[0], after[1]] : []))
    .all();
  const rows: Record<string, unknown>[] = result.results
    .slice(0, 50)
    .map(({ sourceHeader, ...row }) => ({
      ...row,
      exerciseEnvironment:
        row.sourceType === 'tex' ? sourceEnvironment(String(sourceHeader || '')) : null,
    }));
  const last = rows.at(-1);
  const total = !cursor
    ? (await db
        .prepare('SELECT count(*) AS n FROM questions WHERE active=1 AND created_at<=?')
        .bind(cutoff)
        .first<{ n: number }>())!.n
    : undefined;
  return {
    items: await attachQuestionTopics(db, rows),
    total,
    cutoff,
    nextCursor:
      result.results.length > 50 && last ? btoa(JSON.stringify([last.createdAt, last.id])) : null,
  };
}
