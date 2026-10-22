import { readCloudflareConfig } from './cloudflare-config.mjs';
import { writeFile } from 'node:fs/promises';
import { wrangler } from './wrangler.mjs';
const file = 'wrangler.jsonc',
  config = await readCloudflareConfig();
const binding = config.d1_databases?.find((item) => item.binding === 'DB');
if (!binding) throw new Error('Cấu hình thiếu binding DB.');
if (binding.database_id !== '00000000-0000-0000-0000-000000000000') {
  console.log('Đã có database_id. Không tạo database khác.');
  process.exit(0);
}
async function run(args) {
  const child = wrangler(args, { stdio: ['ignore', 'pipe', 'pipe'], env: { CI: 'true' } });
  let output = '';
  child.stdout?.on('data', (chunk) => (output += chunk));
  child.stderr?.on('data', (chunk) => (output += chunk));
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', resolve);
  });
  return { code, output };
}
const auth = await run(['whoami', '--json']);
if (auth.code !== 0)
  throw new Error(
    'Chưa đăng nhập Cloudflare. Chạy npm run cf:login hoặc thêm thông tin bảo mật Cloudflare vào môi trường.',
  );
const created = await run([
  'd1',
  'create',
  binding.database_name,
  '--binding',
  'DB',
  '--update-config=false',
  '--location',
  'apac',
]);
if (created.code !== 0)
  throw new Error(
    'Chưa tạo được D1. Kiểm tra quyền D1 của tài khoản và tên database chưa được sử dụng; không có database cũ nào bị thay đổi.',
  );
const id = created.output.match(/database_id["\s]*[:=]\s*["']([a-f0-9-]{36})["']/i)?.[1];
if (!id)
  throw new Error(
    'Cloudflare đã xử lý lệnh tạo nhưng chưa đọc được ID. Kiểm tra D1 Dashboard và điền database_id trước khi chạy tiếp; không tự tạo lại.',
  );
binding.database_id = id;
await writeFile(file, JSON.stringify(config, null, 2) + '\n');
console.log(
  'Đã tạo D1 với gợi ý vùng APAC và lưu binding DB trong wrangler.jsonc. Chưa triển khai web.',
);
