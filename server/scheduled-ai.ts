import type { Database } from './database';
import type { AdminAiOptions } from './admin-ai';
import { processAutomaticImports } from './automatic-imports';
import { processLatexNormalizations } from './latex-normalizations';
export async function processScheduledAi(
  db: Database,
  options: AdminAiOptions = {},
  now = Date.now(),
) {
  const work = await db
    .prepare(
      `SELECT
 EXISTS(SELECT 1 FROM automatic_import_sources WHERE (state='pending' AND next_attempt<=?) OR (state='working' AND lease_until<=?)) imports,
 EXISTS(SELECT 1 FROM latex_normalization_items i JOIN latex_normalization_jobs j ON j.id=i.job_id WHERE ((i.state='pending' AND i.next_attempt<=?) OR (i.state='working' AND i.lease_until<=?))) normalization`,
    )
    .bind(now, now, now, now)
    .first<{ imports: number; normalization: number }>();
  // Alternate when both queues have work; keep one processor per invocation within D1 Free limits.
  if (work?.normalization && (!work.imports || Math.floor(now / 60000) % 2 === 0))
    await processLatexNormalizations(db, options);
  else if (work?.imports)
    await processAutomaticImports(db, { ...options, budgetMs: 180000, maxItems: 6 });
}
