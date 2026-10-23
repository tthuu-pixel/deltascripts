import type { Database } from './database';
import { HttpError, requireValue } from './errors';
import { attachQuestionTopics } from './content';
import { questionSelect } from './database';

export function questionFilters(url: URL) {
  const topicId = url.searchParams.get('topicId') || '';
  const status = url.searchParams.get('status') || 'all';
  const search = (url.searchParams.get('search') || '').trim().slice(0, 160);
  requireValue(['all', 'draft', 'published'].includes(status), 'Bộ lọc trạng thái không hợp lệ.');
  const conditions = ['q.active=1'];
  const params: unknown[] = [];
  if (status !== 'all') {
    conditions.push('q.published=?');
    params.push(status === 'published' ? 1 : 0);
  }
  if (topicId === 'unassigned')
    conditions.push('NOT EXISTS(SELECT 1 FROM question_topics qt WHERE qt.question_id=q.id)');
  else if (topicId) {
    conditions.push(
      'EXISTS(SELECT 1 FROM question_topics qt WHERE qt.question_id=q.id AND qt.topic_id=?)',
    );
    params.push(topicId);
  }
  if (search) {
    conditions.push("(q.label LIKE ? ESCAPE '\\' OR q.statement_raw LIKE ? ESCAPE '\\')");
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    params.push(pattern, pattern);
  }
  return { conditions, params };
}

export async function readQuestionSelection(db: Database, url: URL) {
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
  const { conditions, params } = questionFilters(url);
  conditions.push('q.created_at<=?');
  params.push(cutoff);
  if (after) {
    conditions.push('q.created_at<=? AND (q.created_at<? OR (q.created_at=? AND q.id>?))');
    params.push(after[0], after[0], after[0], after[1]);
  }
  const result = await db
    .prepare(
      `SELECT q.id,q.created_at AS createdAt FROM questions q WHERE ${conditions.join(' AND ')} ORDER BY q.created_at DESC,q.id LIMIT 501`,
    )
    .bind(...params)
    .all();
  const rows = result.results.slice(0, 500);
  const last = rows.at(-1);
  return {
    ids: rows.map((row) => row.id as string),
    cutoff,
    nextCursor:
      result.results.length > 500 && last ? btoa(JSON.stringify([last.createdAt, last.id])) : null,
  };
}

export async function readSelectedQuestions(db: Database, ids: unknown) {
  requireValue(
    Array.isArray(ids) &&
      ids.length > 0 &&
      ids.length <= 20 &&
      new Set(ids).size === ids.length &&
      ids.every((id) => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)),
    'Chọn từ 1 đến 20 ID câu hỏi hợp lệ.',
  );
  const rows = (
    await db
      .prepare(
        `SELECT ${questionSelect} FROM questions q WHERE q.active=1 AND q.id IN (${ids.map(() => '?').join(',')})`,
      )
      .bind(...ids)
      .all()
  ).results;
  requireValue(
    rows.length === ids.length,
    'Một số câu đã bị xóa. Hãy tải lại ngân hàng câu hỏi.',
    409,
  );
  const items = await attachQuestionTopics(db, rows);
  return ids.map((id) => items[rows.findIndex((row) => row.id === id)]);
}
