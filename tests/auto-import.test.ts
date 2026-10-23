import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Question } from '../src/types';
import type { TopicSummary } from '../shared/content';
import { runAutoImport, type AutoImportOutcome } from '../src/services/autoImport';
import { ApiError } from '../src/services/apiService';

const topic: TopicSummary = {
  id: crypto.randomUUID(),
  title: 'Chuyên đề có sẵn',
  category: 'Đại số',
  description: '',
  icon: 'equation',
  color: 'blue',
  position: 0,
  published: true,
  version: 1,
  questionCount: 0,
};
const questions = (count: number): Question[] =>
  Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Bài ${i + 1}`,
    number: i + 1,
    numberOrigin: 'order',
    statementRaw: `Tính $\\frac{${i + 1}}{2}$.`,
    solutionRaw: 'Lời giải ban đầu.',
    raw: `Nguồn đầy đủ ${i + 1}`,
    sourceType: 'tex',
  }));
const suggestion = (q: Question) => ({
  id: q.id,
  topicIds: [topic.id],
  reason: 'Khớp với chuyên đề đang có.',
});
const base = () => ({
  topics: [topic],
  signal: new AbortController().signal,
  published: false,
  onQuestion: () => {},
  onSaved: () => {},
  onOutcome: (_outcome: AutoImportOutcome) => {},
});

test('one-click import saves all valid questions and separates syntax, unmatched topic and oversize sources', async () => {
  const input = questions(17);
  input[0].numberOrigin = 'explicit';
  input[2].solutionRaw = '';
  input[7].statementRaw = 'Đề có công thức $x+1';
  input[8].statementRaw = 'x'.repeat(20_001);
  const original = structuredClone(input);
  const saved: Question[] = [],
    sent: string[] = [];
  const result = await runAutoImport(input, {
    ...base(),
    suggest: async (batch) => {
      sent.push(...batch.map((q) => q.id));
      return batch.map((q) => ({
        ...suggestion(q),
        topicIds: q.id === input[5].id ? [] : [topic.id],
      }));
    },
    save: async (batch) => {
      saved.push(...batch);
    },
  });
  assert.equal(saved.length, 14);
  assert.equal(result.results.filter((row) => row.state !== 'saved').length, 3);
  assert(!sent.includes(input[7].id));
  assert(!sent.includes(input[8].id));
  assert.equal(saved.find((q) => q.id === input[0].id)!.number, 1);
  assert(saved.every((q) => q.number === original.find((item) => item.id === q.id)!.number));
  assert(saved.every((q) => q.topicIds?.includes(topic.id) && q.published === false));
  assert(saved.every((q) => q.statementRaw.includes('\\dfrac')));
  for (const q of saved) {
    const source = original.find((item) => item.id === q.id)!;
    assert.equal(q.raw, source.raw);
    assert.equal(q.solutionRaw, source.solutionRaw);
  }
  assert.deepEqual(input, original);
});

test('cached and manually resolved classifications skip paid calls and persist in bounded batches', async () => {
  const input = questions(130).map((q) => ({
    ...q,
    number: 3,
    numberOrigin: 'ai' as const,
    topicIds: [topic.id],
  }));
  const batches: number[] = [];
  const result = await runAutoImport(input, {
    ...base(),
    published: true,
    resolvedIds: new Set(input.map((q) => q.id)),
    suggest: async () => {
      throw new Error('Không được gọi AI lại');
    },
    save: async (batch) => {
      batches.push(batch.length);
      assert(batch.every((q) => q.published));
    },
  });
  assert.deepEqual(batches, [100, 30]);
  assert.equal(result.results.filter((row) => row.state === 'saved').length, 130);
});

test('an invalid server-side row is isolated without blocking other valid writes', async () => {
  const input = questions(8);
  const persisted = new Set<string>();
  const result = await runAutoImport(input, {
    ...base(),
    suggest: async (batch) => batch.map(suggestion),
    save: async (batch) => {
      if (batch.some((q) => q.id === input[3].id))
        throw new ApiError('Dữ liệu câu này không hợp lệ.', 400);
      for (const q of batch) {
        assert(!persisted.has(q.id));
        persisted.add(q.id);
      }
    },
  });
  assert.equal(persisted.size, 7);
  assert.equal(result.results.find((row) => row.id === input[3].id)!.state, 'needs-review');
});

test('lost write acknowledgement can resume with the same IDs without duplicates or repeated AI calls', async () => {
  const input = questions(6),
    latest = new Map(input.map((q) => [q.id, q]));
  const persisted = new Map<string, Question>();
  const resolved = new Set<string>();
  let calls = 0,
    loseAcknowledgement = true;
  const options = {
    ...base(),
    resolvedIds: resolved,
    onQuestion: (q: Question) => {
      latest.set(q.id, q);
      if (q.topicIds?.length) resolved.add(q.id);
    },
    suggest: async (batch: Question[]) => {
      calls++;
      return batch.map(suggestion);
    },
    save: async (batch: Question[]) => {
      batch.forEach((q) => persisted.set(q.id, q));
      if (loseAcknowledgement) {
        loseAcknowledgement = false;
        throw new ApiError('Mất kết nối trước khi xác nhận.', 0);
      }
    },
  };
  const first = await runAutoImport(input, options);
  assert(first.stopped);
  assert(first.results.every((row) => row.state === 'failed'));
  const second = await runAutoImport([...latest.values()], options);
  assert.equal(persisted.size, 6);
  assert(second.results.every((row) => row.state === 'saved'));
  assert.equal(calls, 1);
});

test('stopping during a write acknowledges that write before stopping, and later batches stay pending', async () => {
  const input = questions(25),
    controller = new AbortController();
  let calls = 0,
    saved = 0;
  const result = await runAutoImport(input, {
    ...base(),
    signal: controller.signal,
    suggest: async (batch) => {
      calls++;
      return batch.map(suggestion);
    },
    save: async () => {
      controller.abort();
    },
    onSaved: (batch) => {
      saved += batch.length;
    },
  });
  assert(result.stopped);
  assert.equal(calls, 1);
  assert.equal(saved, 10);
  assert.equal(result.results.filter((row) => row.state === 'saved').length, 10);
  assert.equal(result.results.filter((row) => row.state !== 'saved').length, 15);
});

test('provider setup failure is retryable and does not label every question as needing manual edits', async () => {
  const input = questions(25);
  let calls = 0;
  const result = await runAutoImport(input, {
    ...base(),
    suggest: async () => {
      calls++;
      throw new ApiError('Kiểm tra API key và model.', 503);
    },
    save: async () => {
      throw new Error('Không có kết quả AI để lưu');
    },
  });
  assert(result.stopped);
  assert.equal(calls, 1);
  assert.equal(result.results.filter((row) => row.state === 'needs-review').length, 0);
  assert.equal(result.results.filter((row) => row.state === 'failed').length, 25);
});
