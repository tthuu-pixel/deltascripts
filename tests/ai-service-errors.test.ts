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

test('AI timeouts, connection errors and quota responses have distinct safe retry policies', async () => {
  const { providerRequest, AiServiceError } = await import('../server/ai-provider');
  const config = {
    provider: 'deepseek' as const,
    baseUrl: 'https://api.deepseek.com',
    model: 'fixture',
    apiKey: 'secret-do-not-expose',
  };
  await assert.rejects(
    () =>
      providerRequest(config, 'models', {
        fetchGemini: async () => {
          throw new TypeError('private network details');
        },
      }),
    (e) =>
      e instanceof AiServiceError &&
      e.kind === 'connection' &&
      e.retryAfterMs === 60000 &&
      !e.message.includes('private'),
  );
  await assert.rejects(
    () =>
      providerRequest(config, 'models', {
        requestTimeoutMs: 5,
        fetchGemini: async (_url, init) =>
          new Promise((_resolve, reject) => {
            setTimeout(() => reject(new Error('timed out')), 20);
          }),
      }),
    (e) =>
      e instanceof AiServiceError &&
      e.kind === 'timeout' &&
      e.retryAfterMs === 60000 &&
      !e.message.includes('Base URL'),
  );
  await assert.rejects(
    () =>
      providerRequest(config, 'models', {
        fetchGemini: async () =>
          new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
      }),
    (e) => e instanceof AiServiceError && e.kind === 'quota' && e.retryAfterMs === 120000,
  );
  await assert.rejects(
    () =>
      providerRequest(config, 'models', {
        fetchGemini: async () => new Response('', { status: 401 }),
      }),
    (e) => e instanceof AiServiceError && e.kind === 'configuration' && e.retryAfterMs === 900000,
  );
});

test('a broken AI response stream is retried without exposing private network diagnostics', async () => {
  const { providerRequest, AiServiceError } = await import('../server/ai-provider');
  await assert.rejects(
    () =>
      providerRequest(
        {
          provider: 'deepseek',
          baseUrl: 'https://api.deepseek.com',
          model: 'fixture',
          apiKey: 'private-key',
        },
        'models',
        {
          fetchGemini: async () =>
            new Response(
              new ReadableStream({
                start(controller) {
                  controller.error(new Error('secret network diagnostics'));
                },
              }),
            ),
        },
      ),
    (e) =>
      e instanceof AiServiceError &&
      e.kind === 'connection' &&
      e.retryAfterMs === 60000 &&
      !e.message.includes('secret'),
  );
});
