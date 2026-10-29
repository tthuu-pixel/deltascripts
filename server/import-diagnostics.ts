import type { Database } from './database';
import { requireValue } from './errors';
export async function saveImportDiagnostic(db: Database, body: any) {
  requireValue(body && /^[a-f0-9-]{36}$/i.test(body.id || ''), 'Mã kiểm tra không hợp lệ.');
  requireValue(
    typeof body.stage === 'string' && body.stage.length <= 180,
    'Bước nhập không hợp lệ.',
  );
  for (const field of ['bytes', 'received', 'total'])
    requireValue(
      Number.isSafeInteger(body[field]) &&
        body[field] >= 0 &&
        body[field] <= (field === 'bytes' ? 2147483648 : 10000),
      'Bộ đếm không hợp lệ.',
    );
  requireValue(Array.isArray(body.requests) && body.requests.length <= 20, 'Nhật ký không hợp lệ.');
  const requests = body.requests.map((r: any) => {
    requireValue(
      r &&
        typeof r.path === 'string' &&
        /^\/api\/[a-z0-9/_-]{1,100}$/i.test(r.path) &&
        ['GET', 'POST'].includes(r.method) &&
        Number.isSafeInteger(r.status) &&
        r.status >= -1 &&
        r.status <= 599 &&
        Number.isSafeInteger(r.durationMs) &&
        r.durationMs >= 0 &&
        r.durationMs <= 86400000,
      'Thời gian yêu cầu không hợp lệ.',
    );
    return { path: r.path, method: r.method, status: r.status, durationMs: r.durationMs };
  });
  const details = {
    stage: body.stage,
    bytes: body.bytes,
    received: body.received,
    total: body.total,
    volatile: body.volatile === true,
    requests,
  };
  await db.batch([
    db
      .prepare('INSERT OR IGNORE INTO import_diagnostics(id,created_at,details) VALUES(?,?,?)')
      .bind(body.id, Date.now(), JSON.stringify(details)),
    db.prepare(
      'DELETE FROM import_diagnostics WHERE id NOT IN (SELECT id FROM import_diagnostics ORDER BY created_at DESC,id LIMIT 100)',
    ),
  ]);
  return { id: body.id };
}
