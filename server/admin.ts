import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createTeacher, hashPassword } from './auth.ts';
import { executeRemoteD1 } from './remote-d1.ts';
process.env.WRANGLER_LOG_PATH ??= path.resolve('.data/wrangler-logs');
process.env.XDG_CONFIG_HOME ??= path.resolve('.data/cloudflare-config');
process.env.WRANGLER_SEND_METRICS = 'false';
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    remote: { type: 'boolean', default: false },
    'persist-to': { type: 'string', default: '.data/d1' },
  },
});
const email = positionals[0]?.trim().toLowerCase() || '';
if (!email) throw new Error('Cách dùng: npm run admin:create -- email@example.com [--remote]');
let password = '';
if (process.stdin.isTTY) {
  process.stdout.write('Mật khẩu mới (12–256 ký tự, không hiển thị): ');
  const muted = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const prompt = createInterface({ input: process.stdin, output: muted, terminal: true });
  password = await prompt.question('');
  prompt.close();
  process.stdout.write('\n');
} else {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  password = input.replace(/\r?\n$/, '');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 256)
  throw new Error('Cần email hợp lệ và mật khẩu từ 12 đến 256 ký tự.');
if (values.remote) {
  await executeRemoteD1(
    `INSERT INTO teachers(id,email,password_hash) VALUES(?,?,?)
    ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash`,
    [crypto.randomUUID(), email, await hashPassword(password)],
  );
} else {
  const { getPlatformProxy } = await import('wrangler');
  const proxy = await getPlatformProxy<{ DB: import('./database.ts').Database }>({
    configPath: 'wrangler.jsonc',
    persist: { path: path.join(values['persist-to'], 'v3') },
    remoteBindings: false,
  });
  try {
    await createTeacher(proxy.env.DB, email, password);
  } finally {
    await proxy.dispose();
  }
}
console.log('Đã tạo/cập nhật giáo viên và thu hồi phiên cũ.');
