import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';
import { readFile, readdir } from 'node:fs/promises';
import type { Database } from '../server/database.ts';
import { query } from '../server/database.ts';

export async function createRuntime(
  options: {
    directory?: string;
    port?: number;
    origin?: string;
    fetchGemini?: typeof fetch;
    aiSettingsKey?: string;
    initialize?: boolean;
  } = {},
) {
  const result = await build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
  });
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: result.outputFiles[0].text,
      compatibilityDate: '2026-10-01',
      host: '127.0.0.1',
      port: options.port ?? 0,
      cf: false,
      log: new Log(LogLevel.ERROR),
      d1Databases: { DB: 'deltascript-test' },
      resourcePersistencePath: options.directory,
      telemetry: { enabled: false },
      bindings: {
        ...(options.aiSettingsKey ? { AI_SETTINGS_KEY: options.aiSettingsKey } : {}),
        APP_ORIGIN: options.origin || '',
        ...(options.fetchGemini ? { GEMINI_API_KEY: 'test-fixture-key' } : {}),
      },
      serviceBindings: { ASSETS: async () => new Response('frontend fixture') },
      ...(options.fetchGemini
        ? {
            outboundService: async (request: Request) =>
              options.fetchGemini!(request.url, {
                method: request.method,
                headers: request.headers,
                body: await request.text(),
              }),
          }
        : {}),
    }),
  );
  try {
    const url = await mf.ready;
    const d1 = (await mf.getD1Database('DB')) as unknown as Database;
    if (options.initialize !== false) {
      const { unstable_splitSqlQuery } = await import('wrangler');
      const migrations = new URL('../migrations/', import.meta.url);
      for (const file of (await readdir(migrations)).filter((f) => f.endsWith('.sql')).sort()) {
        const schema = await readFile(new URL(file, migrations), 'utf8');
        await d1.batch(unstable_splitSqlQuery(schema).map((sql) => d1.prepare(sql)));
      }
    }
    return {
      mf,
      url,
      db: {
        prepare: d1.prepare.bind(d1),
        batch: d1.batch.bind(d1),
        exec: d1.exec.bind(d1),
        query: (sql: string, params: unknown[] = []) => query(d1, sql, params),
      },
      close: () => mf.dispose(),
    };
  } catch (error) {
    await mf.dispose();
    throw error;
  }
}
