import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateReply } from '../server/ai-provider';
import { scanQuestions } from '../src/services/autoClassify';
import { ApiError } from '../src/services/apiService';
test('provider failures explain credentials, credit and missing models instead of retrying all questions blindly', async () => {
  for (const [status, pattern] of [
    [401, /API key/],
    [402, /số dư/],
    [403, /quyền/],
    [404, /model/],
  ] as const) {
    await assert.rejects(
      () =>
        generateReply(
          {
            provider: 'deepseek',
            model: 'fixture',
            apiKey: 'fixture',
            baseUrl: 'https://api.deepseek.com',
          },
          { fetchGemini: async () => Response.json({ error: { code: 'fixture' } }, { status }) },
          'Test',
          [{ role: 'user', content: '2+2' }],
          100,
        ),
      (e) => (e as any).status === 503 && pattern.test((e as Error).message),
    );
  }
  const reason = 'API key không hợp lệ (HTTP 401).';
  const result = await scanQuestions(
    [
      {
        id: crypto.randomUUID(),
        label: 'Test',
        number: 1,
        sourceType: 'tex',
        exerciseEnvironment: 'bt',
        statementRaw: 'Tự luận.',
        solutionRaw: '',
      },
    ],
    {
      signal: new AbortController().signal,
      suggest: async () => {
        throw new ApiError(reason, 503);
      },
      apply: () => {},
      onOutcome: () => {},
    },
  );
  assert.equal(result.reason, reason);
  assert.equal(result.stopped, true);
});
