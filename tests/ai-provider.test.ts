import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateReply, type ProviderConfig } from '../server/ai-provider';
import { aiProviders } from '../shared/ai';
import { HttpError } from '../server/errors';

async function generate(provider: ProviderConfig['provider'], model: string, response?: unknown) {
  let sent: any;
  const reply = await generateReply(
    { provider, baseUrl: aiProviders[provider].baseUrl, model, apiKey: 'provider-fixture-key' },
    {
      fetchGemini: async (_url, init) => {
        sent = JSON.parse(String(init?.body));
        return Response.json(
          response ||
            (provider === 'gemini'
              ? {
                  candidates: [
                    {
                      content: {
                        parts: [{ thought: true, text: 'Không hiển thị' }, { text: 'Đáp án.' }],
                      },
                    },
                  ],
                }
              : { choices: [{ message: { content: 'Đáp án.' } }] }),
        );
      },
    },
    'Trợ giảng toán.',
    [{ role: 'user', content: 'Giải bài toán.' }],
    2000,
  );
  return { reply, sent };
}

test('new reasoning models have space for reasoning and final answers while old saved models keep their parameters', async () => {
  const argon = await generate('gemini', 'gemini-4-argon');
  assert.equal(argon.reply, 'Đáp án.');
  assert(argon.sent.generationConfig.maxOutputTokens >= 32768);
  assert.equal(argon.sent.generationConfig.thinkingConfig.thinkingLevel, 'LOW');
  const flash = await generate('gemini', 'gemini-3.8-flash');
  assert(flash.sent.generationConfig.maxOutputTokens >= 8192);
  const gpt = await generate('openai', 'gpt-6.1-sol');
  assert.equal(gpt.reply, 'Đáp án.');
  assert(gpt.sent.max_completion_tokens >= 16384);
  assert.equal(gpt.sent.reasoning_effort, 'low');
  const legacyGemini = await generate('gemini', 'gemini-2.5-flash');
  assert.equal(legacyGemini.sent.generationConfig.maxOutputTokens, 2000);
  assert(!legacyGemini.sent.generationConfig.thinkingConfig);
  const legacyGpt = await generate('openai', 'gpt-4.1-mini');
  assert.equal(legacyGpt.sent.max_completion_tokens, 2000);
  assert(!legacyGpt.sent.reasoning_effort);
});

test('truncated responses are rejected instead of displaying unfinished explanations', async () => {
  const truncated = [
    [
      'gemini',
      'gemini-4-argon',
      {
        candidates: [
          { finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Lời giải bị cắt' }] } },
        ],
      },
    ],
    [
      'openai',
      'gpt-6.1-sol',
      { choices: [{ finish_reason: 'length', message: { content: 'Lời giải bị cắt' } }] },
    ],
    [
      'anthropic',
      'claude-sonnet-5-5',
      { stop_reason: 'max_tokens', content: [{ type: 'text', text: 'Lời giải bị cắt' }] },
    ],
  ] as const;
  for (const [provider, model, response] of truncated)
    await assert.rejects(
      generate(provider, model, response),
      (error: any) =>
        error instanceof HttpError && error.status === 502 && error.message.includes('chưa tạo đủ'),
    );
});
