import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, ApiError, clearApiCache } from '../src/services/apiService';

test('transient read failures retry and simultaneous reads share one recovery', async (t) => {
  clearApiCache();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    if (calls === 1) throw new TypeError('fixture connection reset');
    if (calls === 2) return new Response('temporary gateway failure', { status: 502 });
    return Response.json({ success: true, generation: 7, items: [] });
  });
  const [first, second] = await Promise.all([
    apiRequest('/admin/imports'),
    apiRequest('/admin/imports'),
  ]);
  assert.equal(calls, 3);
  assert.equal(first.generation, 7);
  assert.deepEqual(first, second);
});

test('persistent read failures remain bounded, and writes are never blindly replayed', async (t) => {
  clearApiCache();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    throw new TypeError('fixture offline');
  });
  await assert.rejects(
    () => apiRequest('/questions?page=1'),
    (e: any) => e instanceof ApiError && e.status === 0,
  );
  assert.equal(calls, 3);
  await assert.rejects(() => apiRequest('/admin/imports/start', { id: 'fixture' }));
  assert.equal(calls, 4);
});

test('validation errors and explicit cancellation do not trigger connection retries', async (t) => {
  clearApiCache();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({ success: false, error: 'Invalid filter' }, { status: 400 });
  });
  await assert.rejects(
    () => apiRequest('/questions?topicId=bad'),
    (e: any) => e.status === 400,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => apiRequest('/questions?page=2', undefined, 0, controller.signal),
    (e: any) => e.name === 'AbortError',
  );
  assert.equal(calls, 1);
});
