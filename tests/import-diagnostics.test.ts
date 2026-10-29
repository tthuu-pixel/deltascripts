import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime';
import { saveImportDiagnostic } from '../server/import-diagnostics';
import { automaticImportsRoute } from '../server/automatic-imports';
import { parseTexText } from '../shared/texParser';
import { upsertQuestions } from '../server/question-storage';

test('import diagnostics are admin-only, bounded and discard source, credentials and query data', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const response = await fetch(runtime.url.origin + '/api/admin/imports/diagnostic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 401);
  const body = {
    id: crypto.randomUUID(),
    stage: 'Đang gửi câu 1–15 / 64',
    bytes: 285768,
    received: 0,
    total: 64,
    volatile: true,
    raw: 'PRIVATE SOURCE',
    apiKey: 'PRIVATE KEY',
    requests: [
      {
        path: '/api/admin/imports/items',
        method: 'POST',
        status: -1,
        durationMs: 16000,
        body: 'PRIVATE SOURCE',
        headers: { Authorization: 'PRIVATE KEY' },
      },
    ],
  };
  await saveImportDiagnostic(runtime.db, body);
  const saved = String(
    (await runtime.db.query('SELECT details FROM import_diagnostics')).rows[0].details,
  );
  assert(!saved.includes('PRIVATE'));
  assert(saved.includes('16000'));
  await assert.rejects(() =>
    saveImportDiagnostic(runtime.db, {
      ...body,
      id: crypto.randomUUID(),
      requests: [{ ...body.requests[0], path: '/api/admin/ai/settings?key=PRIVATE' }],
    }),
  );
  assert.equal((await runtime.db.query('SELECT id FROM questions')).rows.length, 0);
});

test('replaying a finished upload after a cache deletion failure does not requeue a deleted question', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const db = runtime.db,
    q = parseTexText(String.raw`\begin{bt}Nguồn của chủ trang.\loigiai{Giữ nguyên.}\end{bt}`)[0],
    id = crypto.randomUUID();
  await automaticImportsRoute(db, '/api/admin/imports/start', 'POST', {
    id,
    files: ['source.tex'],
    expected: 1,
  });
  await automaticImportsRoute(db, '/api/admin/imports/items', 'POST', { id, items: [q] });
  await automaticImportsRoute(db, '/api/admin/imports/finish', 'POST', { id });
  await upsertQuestions(db, [q]);
  await db
    .prepare("UPDATE automatic_import_sources SET state='published' WHERE question_id=?")
    .bind(q.id)
    .run();
  await db.prepare('UPDATE questions SET active=0 WHERE id=?').bind(q.id).run();
  await automaticImportsRoute(db, '/api/admin/imports/items', 'POST', { id, items: [q] });
  assert.equal(
    (await db.query('SELECT state FROM automatic_import_sources')).rows[0].state,
    'published',
  );
  assert.equal((await db.query('SELECT active FROM questions')).rows[0].active, 0);
});
