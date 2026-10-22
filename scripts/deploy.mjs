import { readCloudflareConfig } from './cloudflare-config.mjs';
import { wrangler } from './wrangler.mjs';
const config = await readCloudflareConfig();
const id = config.d1_databases?.find((binding) => binding.binding === 'DB')?.database_id;
if (!id || id === '00000000-0000-0000-0000-000000000000') {
  console.error(
    'Chưa có D1 trên Cloudflare. Đăng nhập bằng npm run cf:login (hoặc biến bảo mật Cloudflare), sau đó chạy npm run cf:setup.',
  );
  process.exit(1);
}
async function run(args, options = {}) {
  const child = wrangler(args, options);
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', resolve);
  });
  if (code !== 0) process.exit(code ?? 1);
}
await run(['whoami', '--json'], { stdio: ['ignore', 'ignore', 'inherit'] });
await run(['d1', 'migrations', 'apply', 'DB', '--remote'], { env: { CI: 'true' } });
await run(['deploy']);
