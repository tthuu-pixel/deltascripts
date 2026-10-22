import { parseArgs } from 'node:util';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { newToken, tokenHash } from './auth.ts';
import type { Database } from './database.ts';
import { executeRemoteD1 } from './remote-d1.ts';

const { values } = parseArgs({
  options: {
    remote: { type: 'boolean', default: false },
    origin: { type: 'string' },
    output: { type: 'string', default: '.data/admin-setup-link.json' },
    'persist-to': { type: 'string', default: '.data/d1' },
  },
});
const origin = new URL(values.origin || (values.remote ? '' : 'http://localhost:3000'));
if (
  origin.username ||
  origin.password ||
  origin.search ||
  origin.hash ||
  origin.pathname !== '/' ||
  (values.remote ? origin.protocol !== 'https:' : !['http:', 'https:'].includes(origin.protocol))
)
  throw new Error('Cần --origin là tên miền web; bản thật phải dùng HTTPS.');
const output = path.resolve(values.output);
// This file is a credential. Keep it in the ignored data directory.
if (!output.startsWith(path.resolve('.data') + path.sep))
  throw new Error('Lưu liên kết trong thư mục .data để tránh đưa vào Git.');
const token = newToken();
const hash = await tokenHash(token);
const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
const statement = `INSERT INTO teacher_setup_links(id,token_hash,expires_at,used_at)
  SELECT 1,?, ?,NULL WHERE NOT EXISTS(SELECT 1 FROM teachers)
  ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,
  expires_at=excluded.expires_at,used_at=NULL WHERE NOT EXISTS(SELECT 1 FROM teachers)
  RETURNING id`;
let issued = false;
if (values.remote) {
  issued = (await executeRemoteD1(statement, [hash, expiresAt])).results[0]?.id === 1;
} else {
  process.env.WRANGLER_SEND_METRICS = 'false';
  process.env.WRANGLER_LOG_PATH ??= path.resolve('.data/wrangler-logs');
  process.env.XDG_CONFIG_HOME ??= path.resolve('.data/cloudflare-config');
  const { getPlatformProxy } = await import('wrangler');
  const proxy = await getPlatformProxy<{ DB: Database }>({
    configPath: 'wrangler.jsonc',
    persist: { path: path.join(values['persist-to'], 'v3') },
    remoteBindings: false,
  });
  try {
    issued = !!(await proxy.env.DB.prepare(statement).bind(hash, expiresAt).first());
  } finally {
    await proxy.dispose();
  }
}
if (!issued)
  throw new Error(
    'Đã có giáo viên. Liên kết thiết lập không dùng để thêm tài khoản hoặc đổi mật khẩu.',
  );
await mkdir(path.dirname(output), { recursive: true });
await writeFile(
  output,
  JSON.stringify({ url: `${origin.origin}/setup#token=${token}`, expiresAt }),
  { mode: 0o600 },
);
await chmod(output, 0o600);
console.log(
  `Đã lưu liên kết thiết lập riêng tại ${path.relative(process.cwd(), output)}. Hết hạn sau 24 giờ; chỉ dùng một lần.`,
);
