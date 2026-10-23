import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getPlatformProxy } from 'wrangler';
import type { Database } from '../server/database';
import { upsertQuestions } from '../server/app';
const exec = promisify(execFile);

test('normalization CLI backs up and formats essays while preserving figures, choices, publication, and soft deletions', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'deltascript-essay-cli-'));
  const env = {
    ...process.env,
    WRANGLER_SEND_METRICS: 'false',
    WRANGLER_LOG_PATH: path.resolve('.data/wrangler-logs'),
    XDG_CONFIG_HOME: path.resolve('.data/cloudflare-config'),
  };
  const open = () =>
    getPlatformProxy<{ DB: Database }>({
      configPath: 'wrangler.jsonc',
      persist: { path: path.join(directory, 'v3') },
      remoteBindings: false,
    });
  try {
    await exec(
      process.execPath,
      [
        'scripts/wrangler.mjs',
        'd1',
        'migrations',
        'apply',
        'DB',
        '--local',
        '--persist-to',
        directory,
      ],
      { env },
    );
    let proxy = await open();
    const id = crypto.randomUUID(),
      multiple = crypto.randomUUID(),
      deleted = crypto.randomUUID();
    const picture = String.raw`\begin{tikzpicture}\draw (2.5,0)--(1,1);\end{tikzpicture}`;
    const source =
      String.raw`\begin{ex}\immini[thm]{Tính $\frac{1}{2}$.}{` +
      picture +
      String.raw`}\loigiai{Đáp án $\frac{1}{2}$.}\end{ex}`;
    const choices = String.raw`\begin{ex}Chọn.\choice{A}{B}{C}{D}\end{ex}`;
    try {
      await upsertQuestions(proxy.env.DB, [
        {
          id,
          label: 'Bài giữ nhãn',
          number: 3,
          sourceType: 'tex',
          statementRaw: String.raw`\immini[thm]{Tính $\frac{1}{2}$.}{` + picture + '}',
          solutionRaw: String.raw`Đáp án $\frac{1}{2}$.`,
          raw: source,
          published: false,
        },
        {
          id: multiple,
          label: 'Trắc nghiệm',
          number: 1,
          sourceType: 'tex',
          statementRaw: String.raw`Chọn.\choice{A}{B}{C}{D}`,
          solutionRaw: '',
          raw: choices,
        },
        {
          id: deleted,
          label: 'Đã xóa',
          number: 1,
          sourceType: 'tex',
          statementRaw: 'Đã xóa',
          raw: '\\begin{ex}Đã xóa\\end{ex}',
        },
      ]);
      await proxy.env.DB.prepare('UPDATE questions SET active=0 WHERE id=?').bind(deleted).run();
    } finally {
      await proxy.dispose();
    }
    const run = async (apply = false) => {
      const { stdout } = await exec(
        process.execPath,
        [
          '--import',
          'tsx',
          'server/normalize-essay-bank.ts',
          '--persist-to',
          directory,
          ...(apply ? ['--apply'] : []),
        ],
        { env },
      );
      return JSON.parse(stdout.trim().split('\n').at(-1)!);
    };
    const preview = await run();
    assert.equal(preview.total, 2);
    assert.equal(preview.normalized, 1);
    assert.equal(preview.skipped, 1);
    const result = await run(true);
    assert.equal(result.applied, true);
    proxy = await open();
    try {
      const q = await proxy.env.DB.prepare('SELECT * FROM questions WHERE id=?').bind(id).first();
      assert(q);
      assert.equal(q.published, 0);
      assert.equal(q.number, 3);
      assert.equal(q.label, 'Bài giữ nhãn');
      assert(String(q.raw).startsWith('\\begin{bt}'));
      assert(!String(q.raw).includes('\\immini'));
      assert(String(q.raw).includes(picture));
      assert.equal(
        (await proxy.env.DB.prepare('SELECT raw FROM questions WHERE id=?').bind(multiple).first())!
          .raw,
        choices,
      );
      assert.equal(
        (await proxy.env.DB.prepare('SELECT active FROM questions WHERE id=?')
          .bind(deleted)
          .first())!.active,
        0,
      );
      const history = (await proxy.env.DB.prepare(
        'SELECT snapshot FROM question_revisions WHERE question_id=?',
      )
        .bind(id)
        .first())!;
      assert.equal(JSON.parse(String(history.snapshot)).raw, source);
    } finally {
      await proxy.dispose();
    }
    assert.equal((await run(true)).normalized, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
