import { processScheduledAi } from './scheduled-ai';
import { createApp } from './app.ts';
import type { Database } from './database.ts';
export interface Env {
  DB: Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  AI_SETTINGS_KEY?: string;
  APP_ORIGIN?: string;
}
export default {
  async scheduled(_event: { cron?: string }, env: Env): Promise<void> {
    if (_event.cron === '* * * * *') {
      await processScheduledAi(env.DB, { aiSettingsKey: env.AI_SETTINGS_KEY });
      return;
    }
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare(
        'DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE expires_at<? LIMIT 10000)',
      ).bind(now),
      env.DB.prepare(
        'DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at<? LIMIT 10000)',
      ).bind(now),
      env.DB.prepare(
        'DELETE FROM student_logins WHERE id IN (SELECT id FROM student_logins WHERE login_time<? LIMIT 10000)',
      ).bind(now - 30 * 24 * 60 * 60 * 1000),
    ]);
  },
  async fetch(
    request: Request,
    env: Env,
    ctx?: { waitUntil(p: Promise<unknown>): void },
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/'))
      return createApp(env.DB, {
        aiSettingsKey: env.AI_SETTINGS_KEY,
        geminiKey: env.GEMINI_API_KEY,
        geminiModel: env.GEMINI_MODEL,
        allowedOrigins: [
          ...(env.APP_ORIGIN ? [env.APP_ORIGIN] : []),
          ...(['localhost', '127.0.0.1'].includes(url.hostname)
            ? ['http://localhost:3000', 'http://127.0.0.1:3000']
            : []),
        ],
      }).fetch(request);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'no-referrer');
    if (url.pathname.startsWith('/assets/'))
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(response.body, { status: response.status, headers });
  },
};
