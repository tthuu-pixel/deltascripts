import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { executeRemoteD1 } from './remote-d1';
import { seedStudyGuide } from './study-guide';
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
async function run(execute: typeof executeRemoteD1) {
  if (values.apply) {
    const backup = await execute('SELECT content,version FROM student_settings WHERE id=1', []);
    await mkdir('.data/backups', { recursive: true });
    await writeFile(
      `.data/backups/study-guide-${values.remote ? 'remote' : 'local'}-${Date.now()}.json`,
      JSON.stringify(backup.results),
      { mode: 0o600 },
    );
  }
  console.log(JSON.stringify(await seedStudyGuide(execute, values.apply)));
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
      const result = await proxy.env.DB.prepare(sql)
        .bind(...params)
        .all();
      return { results: result.results, meta: { changes: result.meta.changes } };
    });
  } finally {
    await proxy.dispose();
  }
}
