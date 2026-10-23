import type { Database, Statement } from './database';
import type { Question } from '../src/types';
import type { AutomaticImportJob } from '../shared/automaticImport';
import { canProcessEssay, normalizeEssayQuestion } from '../shared/essayNormalization';
import { validateQuestion } from './question-storage';
import { adminAiRoute, type AdminAiOptions } from './admin-ai';
import { HttpError, requireValue } from './errors';

const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9-]{36}$/i.test(v);
export async function automaticSourceHash(q: Question) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(
      JSON.stringify([
        q.sourceType,
        (q.originalRaw || q.raw || q.statementRaw + '\n' + q.solutionRaw).replace(/\r\n?/g, '\n'),
        q.latexPreamble || '',
      ]),
    ),
  );
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export async function automaticImportJobs(db: Database): Promise<AutomaticImportJob[]> {
  const rows = (
    await db
      .prepare(
        `SELECT j.id,j.files,j.expected,j.submitted,j.created_at,
   count(m.input_id) received,
   coalesce(sum(s.state='published'),0) published,coalesce(sum(s.state='skipped'),0) skipped,
   coalesce(sum(s.state='pending'),0) waiting,coalesce(sum(s.state='working'),0) working,
   count(DISTINCT CASE WHEN s.state='published' THEN s.question_id END) publishedQuestions,
   min(CASE WHEN s.state='pending' THEN s.next_attempt END) nextAttempt,
   coalesce((SELECT s2.reason FROM automatic_import_members m2 JOIN automatic_import_sources s2 ON s2.hash=m2.source_hash WHERE m2.job_id=j.id AND s2.state='pending' AND s2.reason!='' ORDER BY s2.updated_at DESC LIMIT 1),'') reason
   FROM automatic_import_jobs j LEFT JOIN automatic_import_members m ON m.job_id=j.id
   LEFT JOIN automatic_import_sources s ON s.hash=m.source_hash
   WHERE j.id IN (SELECT id FROM automatic_import_jobs ORDER BY created_at DESC,id LIMIT 20)
   GROUP BY j.id ORDER BY j.created_at DESC,j.id`,
      )
      .all()
  ).results;
  return rows.map((r) => ({
    id: String(r.id),
    files: JSON.parse(String(r.files)),
    expected: Number(r.expected),
    received: Number(r.received),
    published: Number(r.published),
    skipped: Number(r.skipped),
    waiting: Number(r.waiting),
    working: Number(r.working),
    publishedQuestions: Number(r.publishedQuestions),
    submitted: r.submitted === 1,
    reason: String(r.reason || ''),
    nextAttempt: r.nextAttempt === null ? null : Number(r.nextAttempt),
    createdAt: Number(r.created_at),
  }));
}
export async function automaticImportsRoute(
  db: Database,
  route: string,
  method: string,
  body: any,
) {
  if (route === '/api/admin/imports' && method === 'GET')
    return { items: await automaticImportJobs(db) };
  requireValue(uuid(body.id), 'Mã lượt tải không hợp lệ.');
  if (route === '/api/admin/imports/start' && method === 'POST') {
    requireValue(
      Array.isArray(body.files) &&
        body.files.length > 0 &&
        body.files.length <= 100 &&
        body.files.every((f: unknown) => typeof f === 'string' && f.length <= 250),
      'Tên tệp không hợp lệ.',
    );
    requireValue(
      Number.isInteger(body.expected) && body.expected > 0 && body.expected <= 10000,
      'Mỗi lượt nhận tối đa 10.000 câu.',
    );
    const now = Date.now();
    await db
      .prepare(
        'INSERT OR IGNORE INTO automatic_import_jobs(id,files,expected,created_at,updated_at) VALUES(?,?,?,?,?)',
      )
      .bind(body.id, JSON.stringify(body.files), body.expected, now, now)
      .run();
    const job = await db
      .prepare('SELECT files,expected FROM automatic_import_jobs WHERE id=?')
      .bind(body.id)
      .first();
    requireValue(
      job && job.expected === body.expected && job.files === JSON.stringify(body.files),
      'Mã lượt tải đã được dùng cho tệp khác.',
      409,
    );
    return { id: body.id };
  }
  if (route === '/api/admin/imports/items' && method === 'POST') {
    const job = await db
      .prepare('SELECT id FROM automatic_import_jobs WHERE id=?')
      .bind(body.id)
      .first();
    requireValue(job, 'Lượt tải không tồn tại.', 404);
    requireValue(
      Array.isArray(body.items) && body.items.length > 0 && body.items.length <= 15,
      'Mỗi lần nhận từ 1 đến 15 câu.',
    );
    const statements: Statement[] = [];
    for (const q of body.items as Question[]) {
      validateQuestion(q);
      const hash = await automaticSourceHash(q);
      const eligible = canProcessEssay(q);
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO automatic_import_sources(hash,question_id,payload,state,reason,updated_at) VALUES(?,?,?,?,?,?)`,
          )
          .bind(
            hash,
            q.id,
            JSON.stringify(q),
            eligible ? 'pending' : 'skipped',
            eligible ? '' : 'Nguồn không thuộc bài tự luận bt hoặc ex không có lựa chọn đáp án.',
            Date.now(),
          ),
      );
      // An explicit new upload may re-import a previously removed source; unrelated deleted sources stay removed.
      statements.push(
        db
          .prepare(
            `UPDATE automatic_import_sources SET state='pending',payload=?,question_id=?,attempts=0,next_attempt=0,reason='',updated_at=? WHERE hash=? AND state='published' AND NOT EXISTS(SELECT 1 FROM questions q WHERE q.id=automatic_import_sources.question_id AND q.active=1)`,
          )
          .bind(JSON.stringify(q), q.id, Date.now(), hash),
      );
      statements.push(
        db
          .prepare(
            'INSERT OR IGNORE INTO automatic_import_members(job_id,input_id,source_hash) VALUES(?,?,?)',
          )
          .bind(body.id, q.id, hash),
      );
    }
    statements.push(
      db
        .prepare('UPDATE automatic_import_jobs SET updated_at=? WHERE id=?')
        .bind(Date.now(), body.id),
    );
    await db.batch(statements);
    return { accepted: body.items.length };
  }
  if (route === '/api/admin/imports/finish' && method === 'POST') {
    const job = await db
      .prepare(
        'SELECT expected,(SELECT count(*) FROM automatic_import_members m WHERE m.job_id=j.id) received FROM automatic_import_jobs j WHERE id=?',
      )
      .bind(body.id)
      .first();
    requireValue(
      job && job.expected === job.received,
      'Máy chủ đang nhận các phần còn lại của lượt tải.',
      409,
    );
    await db
      .prepare('UPDATE automatic_import_jobs SET submitted=1,updated_at=? WHERE id=?')
      .bind(Date.now(), body.id)
      .run();
    return { id: body.id };
  }
  throw new HttpError(404, 'Không tìm thấy thao tác nhập tự động.');
}

interface Lease {
  hash: string;
  question_id: string;
  payload: string;
  attempts: number;
  lease_token: string;
}
export async function claimAutomaticImports(
  db: Database,
  now = Date.now(),
  limit = 3,
): Promise<Lease[]> {
  const token = crypto.randomUUID();
  const result = await db
    .prepare(
      `UPDATE automatic_import_sources SET state='working',lease_token=?,lease_until=?,attempts=attempts+1,updated_at=?
   WHERE hash IN (SELECT hash FROM automatic_import_sources WHERE (state='pending' AND next_attempt<=?) OR (state='working' AND lease_until<=?) ORDER BY attempts,updated_at,hash LIMIT min(?,max(0,6-(SELECT count(*) FROM automatic_import_sources WHERE state='working' AND lease_until>?))))
   RETURNING hash,question_id,payload,attempts,lease_token`,
    )
    .bind(token, now + 120000, now, now, now, limit, now)
    .all();
  return result.results as unknown as Lease[];
}
const owns = `EXISTS(SELECT 1 FROM automatic_import_sources s WHERE s.hash=? AND s.state='working' AND s.lease_token=? AND s.lease_until>?)`;
export async function publishAutomaticImport(db: Database, lease: Lease, q: Question) {
  const now = Date.now();
  const guard = [lease.hash, lease.lease_token, now];
  const original = JSON.parse(lease.payload) as Question;
  const history = JSON.stringify({
    ...original,
    raw: original.originalRaw || original.raw || '',
    published: false,
  });
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO questions(id,label,number,source_type,statement_raw,solution_raw,raw,latex_preamble,published)
    SELECT ?,?,?,?,?,?,?,?,0 WHERE ${owns}`,
      )
      .bind(
        q.id,
        q.label,
        Number.isInteger(q.number) && q.number >= 1 && q.number <= 7 ? q.number : 1,
        q.sourceType,
        q.statementRaw,
        q.solutionRaw,
        q.raw || '',
        q.latexPreamble || '',
        ...guard,
      ),
    db
      .prepare(
        `INSERT INTO question_topics(question_id,topic_id) SELECT ?,value FROM json_each(?) WHERE ${owns}`,
      )
      .bind(q.id, JSON.stringify(q.topicIds || []), ...guard),
    db
      .prepare(
        `INSERT INTO question_revisions(id,question_id,snapshot,reason) SELECT ?,?,?,'Nguồn tệp tải lên trước khi AI tự sửa và xuất bản' WHERE ${owns}`,
      )
      .bind(q.id + ':automatic', q.id, history, ...guard),
    db.prepare(`UPDATE questions SET published=1 WHERE id=? AND ${owns}`).bind(q.id, ...guard),
    db
      .prepare(
        `UPDATE automatic_import_sources SET state='published',lease_token=NULL,lease_until=0,reason='',updated_at=? WHERE hash=? AND lease_token=? AND state='working' AND lease_until>?`,
      )
      .bind(now, ...guard),
  ]);
  return results[4].meta.changes === 1;
}
async function retryAutomaticImport(db: Database, lease: Lease, reason: string, service = false) {
  const delay = service
    ? 15 * 60_000
    : Math.min(60 * 60_000, 30_000 * 2 ** Math.min(lease.attempts - 1, 7));
  await db
    .prepare(
      `UPDATE automatic_import_sources SET state='pending',lease_token=NULL,lease_until=0,next_attempt=?,reason=?,updated_at=? WHERE hash=? AND lease_token=? AND state='working'`,
    )
    .bind(Date.now() + delay, reason.slice(0, 2000), Date.now(), lease.hash, lease.lease_token)
    .run();
}
export async function wakeAutomaticImports(db: Database) {
  await db
    .prepare(
      "UPDATE automatic_import_sources SET next_attempt=0 WHERE state='pending' AND next_attempt>0",
    )
    .run();
}
export async function processAutomaticImports(
  db: Database,
  options: AdminAiOptions & { budgetMs?: number; maxItems?: number } = {},
) {
  const deadline = Date.now() + (options.budgetMs || 50000);
  let processed = 0;
  while (Date.now() < deadline - 3000 && processed < (options.maxItems || 4)) {
    const leases = await claimAutomaticImports(
      db,
      Date.now(),
      Math.min(3, (options.maxItems || 4) - processed),
    );
    if (!leases.length) break;
    const pending: Lease[] = [];
    // Adopt a matching published source from older imports, avoiding duplicates when retrying an old file.
    for (const lease of leases) {
      try {
        const q = normalizeEssayQuestion(JSON.parse(lease.payload));
        const match = await db
          .prepare(
            `SELECT q.id FROM questions q WHERE q.active=1 AND q.published=1 AND q.label=? AND q.source_type=? AND q.statement_raw=? AND q.solution_raw=? AND q.latex_preamble=?
      AND EXISTS(SELECT 1 FROM question_topics qt JOIN topics t ON t.id=qt.topic_id WHERE qt.question_id=q.id AND t.published=1) LIMIT 1`,
          )
          .bind(q.label, q.sourceType, q.statementRaw, q.solutionRaw, q.latexPreamble || '')
          .first();
        if (match) {
          await db
            .prepare(
              "UPDATE automatic_import_sources SET state='published',question_id=?,lease_token=NULL,lease_until=0,reason='',updated_at=? WHERE hash=? AND lease_token=? AND state='working'",
            )
            .bind(match.id, Date.now(), lease.hash, lease.lease_token)
            .run();
          processed++;
          continue;
        }
      } catch {
        /* Let AI attempt malformed prose; executable drawings remain protected. */
      }
      pending.push(lease);
    }
    if (!pending.length) continue;
    try {
      const reply = (await adminAiRoute(
        db,
        '/api/admin/ai/classify',
        'POST',
        { repair: true, save: false, questions: pending.map((l) => JSON.parse(l.payload)) },
        {
          ...options,
          publishedTopicsOnly: true,
          repairBudgetMs: Math.max(2000, Math.min(43000, deadline - Date.now() - 1000)),
        },
      )) as { items: import('../shared/ai').AiSuggestion[] };
      for (const lease of pending) {
        const item = reply.items.find((x) => x.id === lease.question_id);
        if (item?.question && !item.pending && item.topicIds.length) {
          const next = {
            ...item.question,
            id: lease.question_id,
            topicIds: item.topicIds,
            published: true,
          };
          validateQuestion(next);
          // Recheck publication of topics; a topic unpublished during AI processing must not hide a freshly published question.
          const topics = (
            await db
              .prepare(
                `SELECT id FROM topics WHERE published=1 AND id IN (${next.topicIds.map(() => '?').join(',')})`,
              )
              .bind(...next.topicIds)
              .all()
          ).results;
          if (topics.length !== next.topicIds.length) {
            await retryAutomaticImport(db, lease, 'Đang tự chọn lại chuyên đề được xuất bản.');
            continue;
          }
          await publishAutomaticImport(db, lease, next);
        } else
          await retryAutomaticImport(db, lease, item?.reason || 'AI đang tự xử lý lại câu này.');
        processed++;
      }
    } catch (error) {
      const service = [0, 401, 402, 403, 404, 429, 503].includes((error as HttpError).status);
      for (const lease of pending)
        await retryAutomaticImport(
          db,
          lease,
          (error as Error).message || 'Dịch vụ AI đang tạm gián đoạn.',
          service,
        );
      processed += pending.length;
      if (service) break;
    }
  }
  return { processed };
}
