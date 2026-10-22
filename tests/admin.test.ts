import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, stat, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { tokenHash, verifyPassword } from '../server/auth.ts';
import type { Database } from '../server/database.ts';

function command(args: string[], input = '') {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env: { ...process.env, CI: 'true' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, output }));
    child.stdin.end(input);
  });
}
test('account CLI securely creates and resets a teacher in persistent local D1', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'deltascript-admin-cli-'));
  process.env.WRANGLER_LOG_PATH ??= path.resolve('.data/wrangler-logs');
  process.env.XDG_CONFIG_HOME ??= path.resolve('.data/cloudflare-config');
  process.env.WRANGLER_SEND_METRICS = 'false';
  const { getPlatformProxy } = await import('wrangler');
  const open = () =>
    getPlatformProxy<{ DB: Database }>({
      configPath: 'wrangler.jsonc',
      persist: { path: path.join(directory, 'v3') },
      remoteBindings: false,
    });
  const password = 'cli-test-fixture-password';
  try {
    const migrated = await command([
      'scripts/wrangler.mjs',
      'd1',
      'migrations',
      'apply',
      'DB',
      '--local',
      '--persist-to',
      directory,
    ]);
    assert.equal(migrated.code, 0, migrated.output);
    const created = await command(
      ['--import', 'tsx', 'server/admin.ts', 'cli@example.test', '--persist-to', directory],
      password + '\n',
    );
    assert.equal(created.code, 0, created.output);
    assert(!created.output.includes(password));
    let proxy = await open();
    try {
      const row = await proxy.env.DB.prepare('SELECT id,password_hash FROM teachers WHERE email=?')
        .bind('cli@example.test')
        .first<{ id: string; password_hash: string }>();
      assert(row);
      assert(await verifyPassword(password, row.password_hash));
      await proxy.env.DB.prepare(
        'INSERT INTO sessions(token_hash,role,teacher_id,expires_at) VALUES(?,?,?,?)',
      )
        .bind('fixture', 'teacher', row.id, Date.now() + 60_000)
        .run();
    } finally {
      await proxy.dispose();
    }
    const reset = await command(
      ['--import', 'tsx', 'server/admin.ts', 'cli@example.test', '--persist-to', directory],
      password + '-new\n',
    );
    assert.equal(reset.code, 0, reset.output);
    assert(!reset.output.includes(password));
    proxy = await open();
    try {
      assert.equal(
        (
          await proxy.env.DB.prepare('SELECT count(*) AS total FROM sessions').first<{
            total: number;
          }>()
        )?.total,
        0,
      );
    } finally {
      await proxy.dispose();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('setup CLI stores only a hash in D1, rotates unused links and refuses existing teachers', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'deltascript-setup-cli-'));
  const output = path.resolve(`.data/setup-cli-${randomUUID()}.json`);
  const setup = [
    '--import',
    'tsx',
    'server/setup-link.ts',
    '--origin',
    'https://owner.example.test',
    '--persist-to',
    directory,
    '--output',
    output,
  ];
  process.env.WRANGLER_LOG_PATH ??= path.resolve('.data/wrangler-logs');
  process.env.XDG_CONFIG_HOME ??= path.resolve('.data/cloudflare-config');
  process.env.WRANGLER_SEND_METRICS = 'false';
  const { getPlatformProxy } = await import('wrangler');
  const open = () =>
    getPlatformProxy<{ DB: Database }>({
      configPath: 'wrangler.jsonc',
      persist: { path: path.join(directory, 'v3') },
      remoteBindings: false,
    });
  try {
    const migrated = await command([
      'scripts/wrangler.mjs',
      'd1',
      'migrations',
      'apply',
      'DB',
      '--local',
      '--persist-to',
      directory,
    ]);
    assert.equal(migrated.code, 0, migrated.output);
    const created = await command(setup);
    assert.equal(created.code, 0, created.output);
    const first = JSON.parse(await readFile(output, 'utf8'));
    const token = new URLSearchParams(new URL(first.url).hash.slice(1)).get('token')!;
    assert.equal(new URL(first.url).pathname, '/setup');
    assert.match(token, /^[a-f0-9]{64}$/);
    assert(first.expiresAt > Date.now() + 23 * 60 * 60 * 1000);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    assert(!created.output.includes(token));
    let proxy = await open();
    try {
      const row = await proxy.env.DB.prepare(
        'SELECT token_hash,used_at FROM teacher_setup_links',
      ).first();
      assert.equal(row?.token_hash, await tokenHash(token));
      assert.equal(row?.used_at, null);
    } finally {
      await proxy.dispose();
    }
    assert.equal((await command(setup)).code, 0);
    const second = JSON.parse(await readFile(output, 'utf8'));
    assert.notEqual(second.url, first.url);
    const teacher = await command(
      ['--import', 'tsx', 'server/admin.ts', 'cli-owner@example.test', '--persist-to', directory],
      'cli-setup-test-password\n',
    );
    assert.equal(teacher.code, 0, teacher.output);
    const refused = await command(setup);
    assert.notEqual(refused.code, 0);
    assert.match(refused.output, /Đã có giáo viên/);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).url, second.url);
    proxy = await open();
    try {
      const row = await proxy.env.DB.prepare('SELECT count(*) AS n FROM teachers').first();
      assert.equal(row?.n, 1);
    } finally {
      await proxy.dispose();
    }
  } finally {
    await rm(output, { force: true });
    await rm(directory, { recursive: true, force: true });
  }
});
