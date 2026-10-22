import { spawn } from 'node:child_process';
import { wrangler } from './wrangler.mjs';
const migration = wrangler(
  ['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', '.data/d1'],
  { env: { CI: 'true' } },
);
const migrated = await new Promise((resolve) => migration.on('exit', resolve));
if (migrated !== 0) process.exit(migrated ?? 1);
const processes = [
  wrangler(['dev', '--local', '--port', '3001', '--persist-to', '.data/d1']),
  spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--port=3000', '--host=0.0.0.0', '--strictPort'],
    { stdio: 'inherit' },
  ),
];
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of processes) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 1000).unref();
}
for (const child of processes) {
  child.on('error', () => close(1));
  child.on('exit', (code) => close(code || 0));
}
process.on('SIGINT', () => close());
process.on('SIGTERM', () => close());
