import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime';
import { aiProviders, type AiProvider } from '../shared/ai';

test('student AI uses personal provider/model/key for four protocols and fixed destinations', async (t) => {
  let provider: AiProvider = 'gemini',
    refused = false,
    calls = 0;
  const key = 'personal-key-fixture',
    model = 'future-student-model';
  const runtime = await createRuntime({
    fetchGemini: async (url, init) => {
      calls++;
      assert(String(url).startsWith(aiProviders[provider].baseUrl + '/'));
      const headers = new Headers(init?.headers);
      assert.equal(
        headers.get(
          provider === 'gemini'
            ? 'x-goog-api-key'
            : provider === 'anthropic'
              ? 'x-api-key'
              : 'authorization',
        ),
        provider === 'gemini' || provider === 'anthropic' ? key : `Bearer ${key}`,
      );
      if (refused) return Response.json({ error: { message: key } }, { status: 401 });
      if (String(url).endsWith('/models'))
        return Response.json(
          provider === 'gemini'
            ? {
                models: [
                  { name: 'models/' + model, supportedGenerationMethods: ['generateContent'] },
                  { name: 'models/embed', supportedGenerationMethods: ['embedContent'] },
                ],
              }
            : { data: [{ id: model }] },
        );
      const body = JSON.parse(String(init?.body));
      if (provider === 'gemini') {
        assert(String(url).includes(model + ':generateContent'));
        assert.equal(body.contents[0].parts[0].text, 'Lượt trước');
      } else {
        assert.equal(body.model, model);
        assert.equal(body.messages.at(-1).content.includes('Gợi ý'), true);
      }
      return Response.json(
        provider === 'gemini'
          ? {
              candidates: [
                {
                  content: {
                    parts: [
                      { text: 'Không gửi suy nghĩ', thought: true },
                      { text: 'Gợi ý từng bước.' },
                    ],
                  },
                },
              ],
            }
          : provider === 'anthropic'
            ? { content: [{ type: 'text', text: 'Gợi ý từng bước.' }] }
            : { choices: [{ message: { content: 'Gợi ý từng bước.' } }] },
      );
    },
  });
  t.after(() => runtime.close());
  await runtime.db.prepare("INSERT INTO access_codes(code) VALUES('AISTUD01')").run();
  async function req(route: string, body: unknown, cookie = '') {
    const response = await fetch(new URL('/api' + route, runtime.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      data: (await response.json()) as any,
      cookie: response.headers.get('set-cookie')?.split(';')[0] || '',
    };
  }
  const cookie = (
    await req('/auth/student', {
      studentName: 'Học sinh',
      studentClass: '9A',
      accessCode: 'AISTUD01',
    })
  ).cookie;
  assert(cookie);
  assert.equal((await req('/ai/models', {})).status, 401);
  for (const id of Object.keys(aiProviders) as AiProvider[]) {
    provider = id;
    assert.deepEqual(
      (await req('/ai/models', { provider, apiKey: key, model }, cookie)).data.models,
      [model],
    );
    const response = await req(
      '/ai',
      {
        provider,
        apiKey: key,
        model,
        context: 'Đề bài',
        message: 'Gợi ý',
        history: [
          { role: 'assistant', content: 'Bỏ lượt đầu' },
          { role: 'user', content: 'Lượt trước' },
        ],
      },
      cookie,
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.reply, 'Gợi ý từng bước.');
    assert(!JSON.stringify(response.data).includes(key));
  }
  refused = true;
  const error = await req('/ai', { provider, apiKey: key, model, message: 'Gợi ý' }, cookie);
  assert.equal(error.status, 503);
  assert(!JSON.stringify(error.data).includes(key));
  assert.equal(calls, 9);
});
