import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime.ts';
import { createTeacher } from '../server/auth.ts';
import { aiProviders } from '../shared/ai.ts';
import { validateAiConfig, validateSuggestions } from '../server/admin-ai.ts';

const password = 'admin-ai-fixture-password';
const apiKey = 'provider-fixture-key-not-a-real-key';
const secret = 'encryption-test-fixture-secret-at-least-32-characters';

test('AI configuration validates destinations and strictly validates advisory results', () => {
  for (const baseUrl of [
    'http://api.openai.com/v1',
    'https://127.0.0.1',
    'https://[::1]',
    'https://localhost',
    'https://a.internal',
    'https://user:pass@api.openai.com',
    'https://api.openai.com?key=foo',
    'https://api.openai.com:8080',
    'https://2130706433',
  ])
    assert.throws(() => validateAiConfig({ provider: 'openai', baseUrl, model: 'gpt-test' }));
  assert.equal(
    validateAiConfig({
      provider: 'openai',
      baseUrl: 'https://proxy.my-api.org/v1/',
      model: 'future-model',
    }).baseUrl,
    'https://proxy.my-api.org/v1',
  );
  assert.throws(() =>
    validateSuggestions(
      { items: [{ id: 'q', number: 1, topicIds: ['invented'], reason: '' }] },
      ['q'],
      ['real'],
    ),
  );
  assert.deepEqual(
    validateSuggestions({ items: [{ id: 'q', topicIds: [], reason: '' }] }, ['q'], []),
    [{ id: 'q', topicIds: [], reason: '' }],
  );
  assert.throws(() => validateSuggestions({ items: [] }, ['q'], []));
  assert.throws(() =>
    validateSuggestions(
      {
        items: [
          { id: 'q', topicIds: [], reason: '' },
          { id: 'q', topicIds: [], reason: '' },
        ],
      },
      ['q', 'other'],
      [],
    ),
  );
});

test('admin-only encrypted settings and four provider adapters return suggestions without writing questions', async (t) => {
  let provider = 'gemini';
  let suggestions: any = { items: [] };
  let refused = false;
  let calls = 0;
  const runtime = await createRuntime({
    aiSettingsKey: secret,
    fetchGemini: async (url, init) => {
      calls++;
      const headers = new Headers(init?.headers);
      assert.equal(
        headers.get(
          provider === 'gemini'
            ? 'x-goog-api-key'
            : provider === 'anthropic'
              ? 'x-api-key'
              : 'Authorization',
        ),
        provider === 'gemini' || provider === 'anthropic' ? apiKey : `Bearer ${apiKey}`,
      );
      if (refused)
        return Response.json({ error: { message: `Do not echo ${apiKey}` } }, { status: 401 });
      if (String(url).endsWith('/models'))
        return Response.json(
          provider === 'gemini'
            ? {
                models: [
                  { name: 'models/future-model', supportedGenerationMethods: ['generateContent'] },
                ],
              }
            : { data: [{ id: 'future-model' }] },
        );
      const body = JSON.parse(String(init?.body));
      const prompt =
        provider === 'gemini' ? body.contents[0].parts[0].text : body.messages.at(-1).content;
      assert(prompt.includes('Chuyên đề thử'));
      const sent = JSON.parse(prompt);
      assert.equal(sent.topics[0].description, 'Các bài thực hiện phép tính số học.');
      assert(!Object.hasOwn(sent, 'typeExamples'));
      assert(
        sent.questions.every(
          (q: any) => !Object.hasOwn(q, 'currentNumber') && !Object.hasOwn(q, 'numberOrigin'),
        ),
      );
      assert(!prompt.includes('Never send this solution'));
      const output = JSON.stringify(suggestions);
      return Response.json(
        provider === 'gemini'
          ? { candidates: [{ content: { parts: [{ text: output }] } }] }
          : provider === 'anthropic'
            ? { content: [{ type: 'text', text: output }] }
            : { choices: [{ message: { content: output } }] },
      );
    },
  });
  t.after(() => runtime.close());
  async function req(route: string, body?: unknown, cookie = '') {
    const response = await fetch(new URL('/api' + route, runtime.url), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Cookie: cookie,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: (await response.json()) as any,
      cookie: response.headers.get('set-cookie')?.split(';')[0] || '',
    };
  }
  await createTeacher(runtime.db, 'ai@example.test', password);
  const admin = (await req('/auth/teacher', { email: 'ai@example.test', password })).cookie;
  await req('/access-codes', { code: 'AICLASS1' }, admin);
  const student = (
    await req('/auth/student', {
      studentName: 'Học sinh',
      studentClass: '9A',
      accessCode: 'AICLASS1',
    })
  ).cookie;
  for (const route of ['/admin/ai/settings', '/admin/ai/test', '/admin/ai/classify']) {
    assert.equal((await req(route, route.endsWith('settings') ? undefined : {})).status, 401);
    assert.equal(
      (await req(route, route.endsWith('settings') ? undefined : {}, student)).status,
      403,
    );
  }
  assert.equal((await req('/admin/ai/classify', { questions: [] }, admin)).status, 503);
  const topic = (
    await req(
      '/topics/save',
      {
        topic: {
          title: 'Chuyên đề thử',
          category: 'Đại số',
          description: 'Các bài thực hiện phép tính số học.',
          theory: '',
          preamble: '',
          icon: 'radical',
          color: 'blue',
          published: false,
        },
      },
      admin,
    )
  ).data.topic;
  const question = {
    id: crypto.randomUUID(),
    statementRaw: 'Tính $1+1$.',
    solutionRaw: 'Never send this solution',
  };
  suggestions = {
    items: [{ id: question.id, topicIds: [topic.id], reason: 'Phù hợp nội dung.' }],
  };
  let version = 0;
  for (const [key, defaults] of Object.entries(aiProviders)) {
    provider = key;
    const config = { provider: key, ...defaults, model: 'future-model', apiKey, version };
    const saved = await req('/admin/ai/settings', config, admin);
    assert.equal(saved.status, 200);
    version = saved.data.settings.version;
    assert.equal(saved.data.settings.hasKey, true);
    assert(!JSON.stringify(saved.data).includes(apiKey));
    assert(!JSON.stringify(saved.data).includes('encrypted_key'));
    const stored = await runtime.db.prepare('SELECT encrypted_key FROM admin_ai_settings').first();
    assert(stored && !String(stored.encrypted_key).includes(apiKey));
    const test = await req('/admin/ai/test', { ...config, apiKey: '' }, admin);
    assert.equal(test.status, 200, JSON.stringify({ ...test.data, calls, provider }));
    assert.deepEqual(test.data.models, ['future-model']);
    const classified = await req('/admin/ai/classify', { questions: [question] }, admin);
    assert.equal(classified.status, 200);
    assert.deepEqual(classified.data.items, suggestions.items);
  }
  assert.equal((await runtime.db.prepare('SELECT count(*) AS n FROM questions').first())!.n, 0);
  assert.equal(
    (
      await req(
        '/admin/ai/settings',
        { provider: 'deepseek', ...aiProviders.deepseek, model: 'future-model', version: 0 },
        admin,
      )
    ).status,
    409,
  );
  const config = (await req('/admin/ai/settings', undefined, admin)).data.settings;
  assert.equal(
    (await req('/admin/ai/test', { ...config, baseUrl: 'https://other-provider.org/v1' }, admin))
      .status,
    400,
  );
  suggestions = {
    items: [{ id: question.id, topicIds: [crypto.randomUUID()], reason: 'Invented' }],
  };
  assert.equal((await req('/admin/ai/classify', { questions: [question] }, admin)).status, 502);
  refused = true;
  const refusal = await req('/admin/ai/test', config, admin);
  assert.equal(refusal.status, 503);
  assert(!JSON.stringify(refusal.data).includes(apiKey));
  assert.equal(calls, 10);
});
