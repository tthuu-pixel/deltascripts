import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fetch, EnvHttpProxyAgent } from 'undici';
import { wrangler } from '../scripts/wrangler.mjs';
import { readCloudflareConfig } from '../scripts/cloudflare-config.mjs';

// Use the query API for small administrative writes. Wrangler --file performs
// an R2-backed bulk import, which can fail behind a cloud environment proxy.
// Credentials and SQL parameters never appear in command arguments or logs.
export async function executeRemoteD1(sql: string, params: unknown[]) {
  const config = await readCloudflareConfig();
  const databaseId = config.d1_databases?.find((binding) => binding.binding === 'DB')?.database_id;
  if (!databaseId || !/^[a-f0-9-]{36}$/i.test(databaseId) || /^0{8}-/.test(databaseId))
    throw new Error('Chưa cấu hình D1 thật. Chạy npm run cf:setup trước.');
  const directory = await mkdtemp(path.join(tmpdir(), 'deltascript-cloudflare-auth-'));
  async function capture(args: string[]) {
    const child = wrangler(args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      // auth token --json may be copied to Wrangler's debug log: confine that
      // log to this private temporary directory and remove it after use.
      env: { WRANGLER_LOG_PATH: path.join(directory, 'auth.log') },
    });
    let output = '';
    child.stdout?.on('data', (chunk) => (output += chunk));
    child.stderr?.resume();
    const code = await new Promise<number | null>((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', resolve);
    });
    if (code !== 0)
      throw new Error(
        'Chưa đăng nhập Cloudflare. Kiểm tra cấu hình bảo mật hoặc npm run cf:login.',
      );
    try {
      return JSON.parse(output);
    } catch {
      throw new Error('Không đọc được trạng thái đăng nhập Cloudflare.');
    }
  }
  const dispatcher = new EnvHttpProxyAgent();
  try {
    const auth = process.env.CLOUDFLARE_API_TOKEN
      ? { type: 'api_token', token: process.env.CLOUDFLARE_API_TOKEN }
      : await capture(['auth', 'token', '--json']);
    let accountId = process.env.CLOUDFLARE_ACCOUNT_ID || config.account_id;
    if (!accountId) {
      const info = await capture(['whoami', '--json']);
      if (info.accounts?.length === 1) accountId = info.accounts[0].id;
    }
    if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId))
      throw new Error('Cần CLOUDFLARE_ACCOUNT_ID của tài khoản chứa D1.');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth.type === 'api_key' && auth.key && auth.email) {
      headers['X-Auth-Key'] = auth.key;
      headers['X-Auth-Email'] = auth.email;
    } else if (typeof auth.token === 'string' && auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    } else throw new Error('Thông tin đăng nhập Cloudflare không hợp lệ.');
    let response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ sql, params }),
          dispatcher,
          redirect: 'error',
          signal: AbortSignal.timeout(30_000),
        },
      );
    } catch {
      throw new Error('Không kết nối được API Cloudflare. Kiểm tra mạng rồi thử lại.');
    }
    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cloudflare trả kết quả không hợp lệ (HTTP ${response.status}).`);
    }
    if (
      !response.ok ||
      data.success !== true ||
      !Array.isArray(data.result) ||
      data.result[0]?.success !== true
    )
      throw new Error(
        `Truy vấn D1 chưa thành công (HTTP ${response.status}). Kiểm tra quyền D1 và migrations.`,
      );
    return data.result[0] as { results: Record<string, unknown>[]; meta: { changes: number } };
  } finally {
    await dispatcher.close();
    await rm(directory, { recursive: true, force: true });
  }
}
