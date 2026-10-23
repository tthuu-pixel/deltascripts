import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { canProcessEssay, normalizeEssayQuestion } from '../shared/essayNormalization';
import { extractTikz } from '../shared/tikz';
import { executeRemoteD1 } from './remote-d1';
import { questionSelect } from './database';
import type { Question } from '../src/types';
process.env.WRANGLER_LOG_PATH ??= path.resolve('.data/wrangler-logs');
process.env.XDG_CONFIG_HOME ??= path.resolve('.data/cloudflare-config');
process.env.WRANGLER_SEND_METRICS = 'false';
const { values } = parseArgs({
  options: {
    remote: { type: 'boolean', default: false },
    apply: { type: 'boolean', default: false },
    'persist-to': { type: 'string', default: '.data/d1' },
  },
});
type Execute = typeof executeRemoteD1;
const figures = (text: string) => extractTikz(text).blocks.map((b) => text.slice(b.start, b.end));
async function run(execute: Execute) {
  const rows = (
    await execute(`SELECT ${questionSelect} FROM questions q WHERE active=1 ORDER BY id`, [])
  ).results;
  const links = (await execute('SELECT * FROM question_topics ORDER BY question_id,topic_id', []))
    .results;
  const protectedData = (
    await execute(
      "SELECT json_object('topics',(SELECT json_group_array(json_object('id',id,'title',title,'version',version,'published',published)) FROM topics),'exam',(SELECT content FROM exam_settings WHERE id=1),'settings',(SELECT content FROM student_settings WHERE id=1),'teachers',(SELECT count(*) FROM teachers)) AS snapshot",
      [],
    )
  ).results;
  const updates = [];
  let skipped = 0,
    pending = 0;
  for (const row of rows) {
    const q = {
      ...row,
      active: row.active === 1,
      published: row.published === 1,
      topicIds: links.filter((l) => l.question_id === row.id).map((l) => String(l.topic_id)),
    } as unknown as Question;
    if (!canProcessEssay(q)) {
      skipped++;
      continue;
    }
    try {
      const next = normalizeEssayQuestion(q);
      if (
        JSON.stringify([...figures(q.statementRaw), ...figures(q.solutionRaw)]) !==
        JSON.stringify([...figures(next.statementRaw), ...figures(next.solutionRaw)])
      )
        throw new Error('Hình thay đổi.');
      if (
        q.statementRaw === next.statementRaw &&
        q.solutionRaw === next.solutionRaw &&
        q.raw === next.raw
      )
        continue;
      updates.push({
        id: q.id,
        revisionId: crypto.randomUUID(),
        beforeStatement: q.statementRaw,
        beforeSolution: q.solutionRaw,
        beforeRaw: q.raw || '',
        statement: next.statementRaw,
        solution: next.solutionRaw,
        raw: next.raw,
        snapshot: JSON.stringify(q),
      });
    } catch {
      pending++;
    }
  }
  if (values.apply && updates.length) {
    await mkdir('.data/backups', { recursive: true });
    await writeFile(
      `.data/backups/essay-normalization-${values.remote ? 'remote' : 'local'}-${Date.now()}.json`,
      JSON.stringify({ rows, links, protectedData }),
      { mode: 0o600 },
    );
    // One bound JSON document, with source guards both at backup time and at write time.
    const payload = JSON.stringify(updates);
    await execute(
      `INSERT INTO question_revisions(id,question_id,snapshot,reason)
    SELECT json_extract(j.value,'$.revisionId'),q.id,json_extract(j.value,'$.snapshot'),'Chuẩn hóa tự luận: ex sang bt, bỏ immini'
    FROM json_each(?) j JOIN questions q ON q.id=json_extract(j.value,'$.id')
    WHERE q.active=1 AND q.statement_raw=json_extract(j.value,'$.beforeStatement') AND q.solution_raw=json_extract(j.value,'$.beforeSolution') AND q.raw=json_extract(j.value,'$.beforeRaw')`,
      [payload],
    );
    await execute(
      `WITH changes AS MATERIALIZED(SELECT value FROM json_each(?))
    UPDATE questions AS q SET statement_raw=(SELECT json_extract(value,'$.statement') FROM changes WHERE json_extract(value,'$.id')=q.id),
    solution_raw=(SELECT json_extract(value,'$.solution') FROM changes WHERE json_extract(value,'$.id')=q.id),
    raw=(SELECT json_extract(value,'$.raw') FROM changes WHERE json_extract(value,'$.id')=q.id)
    WHERE q.active=1 AND EXISTS(SELECT 1 FROM changes c JOIN question_revisions r ON r.id=json_extract(c.value,'$.revisionId') WHERE json_extract(c.value,'$.id')=q.id AND q.statement_raw=json_extract(c.value,'$.beforeStatement') AND q.solution_raw=json_extract(c.value,'$.beforeSolution') AND q.raw=json_extract(c.value,'$.beforeRaw'))`,
      [payload],
    );
    const after = (
      await execute(`SELECT ${questionSelect} FROM questions q WHERE active=1 ORDER BY id`, [])
    ).results;
    for (const u of updates) {
      const row = after.find((q) => q.id === u.id);
      if (
        !row ||
        row.statementRaw !== u.statement ||
        row.solutionRaw !== u.solution ||
        row.raw !== u.raw
      )
        throw new Error('Một câu vừa thay đổi, cần đối chiếu bản sao lưu thay vì ghi đè.');
    }
    if (
      JSON.stringify(
        (await execute('SELECT * FROM question_topics ORDER BY question_id,topic_id', [])).results,
      ) !== JSON.stringify(links)
    )
      throw new Error('Liên kết câu hỏi đã thay đổi trong lúc chuẩn hóa.');
    const metadata = (
      await execute(
        "SELECT json_object('topics',(SELECT json_group_array(json_object('id',id,'title',title,'version',version,'published',published)) FROM topics),'exam',(SELECT content FROM exam_settings WHERE id=1),'settings',(SELECT content FROM student_settings WHERE id=1),'teachers',(SELECT count(*) FROM teachers)) AS snapshot",
        [],
      )
    ).results;
    if (JSON.stringify(metadata) !== JSON.stringify(protectedData))
      throw new Error('Cấu hình khác vừa được chỉnh sửa, cần đối chiếu.');
  }
  console.log(
    JSON.stringify({
      total: rows.length,
      normalized: updates.length,
      skipped,
      pending,
      applied: values.apply,
      figuresUnchanged: true,
    }),
  );
}
if (values.remote) await run(executeRemoteD1);
else {
  const { getPlatformProxy } = await import('wrangler');
  const proxy = await getPlatformProxy<{ DB: import('./database').Database }>({
    configPath: 'wrangler.jsonc',
    persist: { path: path.join(values['persist-to'], 'v3') },
    remoteBindings: false,
  });
  try {
    await run(async (sql, params) => {
      const r = await proxy.env.DB.prepare(sql)
        .bind(...params)
        .all();
      return { results: r.results, meta: { changes: r.meta.changes } };
    });
  } finally {
    await proxy.dispose();
  }
}
