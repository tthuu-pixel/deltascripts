import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { executeRemoteD1 } from './remote-d1';
import { seedPracticalTopics } from './practical-topics';
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
    const topics = await execute('SELECT * FROM topics ORDER BY id', []);
    const settings = await execute('SELECT * FROM student_settings ORDER BY id', []);
    await mkdir('.data/backups', { recursive: true });
    await writeFile(
      `.data/backups/practical-topics-${values.remote ? 'remote' : 'local'}-${Date.now()}.json`,
      JSON.stringify({ topics: topics.results, settings: settings.results }),
      { mode: 0o600 },
    );
  }
  console.log(JSON.stringify(await seedPracticalTopics(execute, values.apply)));
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
