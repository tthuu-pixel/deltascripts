import { spawn } from 'node:child_process';
import path from 'node:path';
// Keep logs inside the ignored workspace; do not change HOME or authentication locations.
export const wranglerEnv = {
  ...process.env,
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || path.resolve('.data/cloudflare-config'),
  WRANGLER_SEND_METRICS: 'false',
  WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || path.resolve('.data/wrangler-logs'),
};
export function wrangler(args, options = {}) {
  return spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], {
    stdio: 'inherit',
    ...options,
    env: { ...wranglerEnv, ...options.env },
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/wrangler.mjs')) {
  const child = wrangler(process.argv.slice(2));
  child.on('error', () => process.exit(1));
  child.on('exit', (code) => process.exit(code ?? 1));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
  process.on('SIGINT', () => child.kill('SIGINT'));
}
