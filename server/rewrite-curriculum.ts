import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { executeRemoteD1 } from './remote-d1';
import { curriculumSnapshot, rewriteCurriculum, type ExecuteCurriculum } from './curriculum';
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
const fingerprint = (rows: unknown[]) =>
  createHash('sha256').update(JSON.stringify(rows)).digest('hex');
async function run(execute: ExecuteCurriculum) {
  const questions = (await execute('SELECT * FROM questions ORDER BY id', [])).results;
  const student = (await execute('SELECT * FROM student_settings WHERE id=1', [])).results;
  const accounts = (await execute('SELECT id FROM teachers ORDER BY id', [])).results;
  if (values.apply) {
    const backup = { ...(await curriculumSnapshot(execute)), questions, student, accounts };
    await mkdir('.data/backups', { recursive: true });
    await writeFile(
      `.data/backups/curriculum-${values.remote ? 'remote' : 'local'}-${Date.now()}.json`,
      JSON.stringify(backup),
      { mode: 0o600 },
    );
  }
  const result = await rewriteCurriculum(execute, values.apply);
  if (values.apply) {
    const after = (await execute('SELECT * FROM questions ORDER BY id', [])).results;
    if (fingerprint(after) !== fingerprint(questions))
      throw new Error(
        'Nguồn câu hỏi thay đổi trong thời gian cập nhật, cần đối chiếu bản sao lưu.',
      );
    if (
      fingerprint((await execute('SELECT * FROM student_settings WHERE id=1', [])).results) !==
      fingerprint(student)
    )
      throw new Error('Cấu hình trang học sinh thay đổi trong thời gian cập nhật.');
    if (
      fingerprint((await execute('SELECT id FROM teachers ORDER BY id', [])).results) !==
      fingerprint(accounts)
    )
      throw new Error('Danh sách tài khoản thay đổi trong thời gian cập nhật.');
  }
  console.log(
    JSON.stringify({
      ...result,
      questions: questions.length,
      questionSourcesUnchanged: values.apply,
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
