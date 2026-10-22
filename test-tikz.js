import { spawn } from 'node:child_process';

const child = spawn(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', 'tests/browser/tikz-live.spec.ts'],
  { stdio: 'inherit', env: { ...process.env, TIKZ_LIVE: '1' } },
);
child.on('error', () => {
  console.error('Không khởi động được kiểm thử TikZ. Chạy npm ci trước.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
