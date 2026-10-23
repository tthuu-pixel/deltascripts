import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Question } from '../src/types.ts';
import {
  scanQuestions,
  applySuggestion,
  type ClassificationOutcome,
} from '../src/services/autoClassify.ts';
import { ApiError } from '../src/services/apiService.ts';

const questions = (n: number): Question[] =>
  Array.from({ length: n }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Câu ${i + 1}`,
    number: (i % 7) + 1,
    numberOrigin: 'explicit',
    statementRaw: `Bài $${i}+1$.`,
    solutionRaw: 'Giữ lời giải.',
    sourceType: 'tex',
    exerciseEnvironment: 'bt',
  }));
const suggestion = (q: Question) => ({
  id: q.id,
  topicIds: ['existing-topic'],
  reason: 'Phù hợp.',
});

test('AI queue visits every question across batches, reports failures and resumes only unfinished IDs', async () => {
  const input = questions(31);
  input[30].statementRaw = 'x'.repeat(20_001);
  const outcomes = new Map<string, ClassificationOutcome>();
  const completed = new Set<string>();
  const applied: string[] = [];
  let calls = 0;
  const signal = new AbortController().signal;
  const options = {
    signal,
    completed,
    onOutcome: (o: ClassificationOutcome) => {
      outcomes.set(o.id, o);
      if (o.state !== 'failed') completed.add(o.id);
    },
    apply: async (q: Question) => {
      applied.push(q.id);
    },
  };
  await scanQuestions(input, {
    ...options,
    suggest: async (batch) => {
      calls++;
      if (calls === 2) throw new ApiError('Lượt này bị lỗi.', 502);
      return batch.map(suggestion);
    },
  });
  assert.equal(outcomes.size, 31);
  assert.equal(calls, 3);
  assert.equal(applied.length, 20);
  assert.equal([...outcomes.values()].filter((o) => o.state === 'failed').length, 11);
  let retried = 0;
  await scanQuestions(input, {
    ...options,
    suggest: async (batch) => {
      retried += batch.length;
      return batch.map(suggestion);
    },
  });
  assert.equal(retried, 10);
  assert.equal(new Set(applied).size, 30);
  assert.equal(outcomes.get(input[30].id)?.state, 'failed');
  assert(input.every((q) => q.solutionRaw === 'Giữ lời giải.'));
});

test('AI batches respect character budgets and automatically wait for rate limits', async () => {
  const input = questions(11).map((q) => ({ ...q, statementRaw: 'x'.repeat(18_000) }));
  let waits = 0,
    rateLimited = false;
  const sizes: number[] = [];
  await scanQuestions(input, {
    signal: new AbortController().signal,
    apply: () => {},
    onOutcome: () => {},
    wait: async (ms) => {
      assert.equal(ms, 60_000);
      waits++;
    },
    suggest: async (batch) => {
      assert(batch.length <= 10);
      assert(batch.reduce((n, q) => n + q.statementRaw.length, 0) <= 80_000);
      if (!rateLimited) {
        rateLimited = true;
        throw new ApiError('Quota', 429);
      }
      sizes.push(batch.length);
      return batch.map(suggestion);
    },
  });
  assert.equal(waits, 1);
  assert.deepEqual(sizes, [4, 4, 3]);
});

test('AI assigns only topics and preserves source order, labels, answers and manual memberships', () => {
  for (const number of [0, 2, 17, 130]) {
    const q = {
      ...questions(1)[0],
      number,
      numberOrigin: 'order' as const,
      topicIds: ['manual-topic'],
    };
    const result = applySuggestion(q, suggestion(q));
    assert.deepEqual(result, { ...q, topicIds: ['manual-topic', 'existing-topic'] });
  }
});

test('stopping a scan aborts before another result is applied', async () => {
  const controller = new AbortController();
  const input = questions(21);
  let applied = 0,
    calls = 0;
  await assert.rejects(
    scanQuestions(input, {
      signal: controller.signal,
      onOutcome: () => {},
      apply: () => {
        applied++;
        if (applied === 3) controller.abort();
      },
      suggest: async (batch) => {
        calls++;
        return batch.map(suggestion);
      },
    }),
    { name: 'AbortError' },
  );
  assert.equal(calls, 1);
  assert.equal(applied, 3);
});
