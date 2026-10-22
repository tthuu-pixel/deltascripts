import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRuntime } from './runtime.ts';

test('D1 data and its indexes survive a runtime restart', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'deltascript-d1-'));
  let runtime: Awaited<ReturnType<typeof createRuntime>> | undefined;
  try {
    runtime = await createRuntime({ directory });
    await runtime.db.query('INSERT INTO access_codes(code) VALUES(?)', ['PERSIST1']);
    await runtime.close();
    runtime = undefined;
    runtime = await createRuntime({ directory, initialize: false });
    assert.equal(
      (await runtime.db.query('SELECT code FROM access_codes')).rows[0].code,
      'PERSIST1',
    );
    assert.equal(
      (await runtime.db.query('SELECT COUNT(*) AS n FROM question_counts')).rows[0].n,
      7,
    );
  } finally {
    await runtime?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
