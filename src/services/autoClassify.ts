import type { Question } from '../types';
import type { AiSuggestion } from '../../shared/ai';
import { apiService } from './apiService';

export interface ClassificationOutcome {
  id: string;
  label: string;
  state: 'assigned' | 'unassigned' | 'failed';
  reason: string;
  number: number;
}
export interface ScanProgress {
  processed: number;
  total: number;
  waiting: boolean;
}
const aborted = () => new DOMException('Đã dừng quét AI.', 'AbortError');
export function waitForQuota(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(aborted());
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', stop);
      resolve();
    }, ms);
    function stop() {
      clearTimeout(timer);
      reject(aborted());
    }
    signal.addEventListener('abort', stop, { once: true });
  });
}
export function applySuggestion(question: Question, suggestion: AiSuggestion): Question {
  const preserveNumber =
    question.number >= 1 && question.number <= 7 && question.numberOrigin !== 'order';
  return {
    ...question,
    number: preserveNumber
      ? question.number
      : (suggestion.number ?? (question.numberOrigin === 'order' ? 0 : question.number)),
    numberOrigin: preserveNumber
      ? question.numberOrigin
      : suggestion.number
        ? 'ai'
        : question.numberOrigin,
    topicIds: [...new Set([...(question.topicIds || []), ...suggestion.topicIds])],
  };
}

// Covers every input, including oversized/empty sources and failed batches. Successes can be
// passed back as completed IDs so resuming never pays for the same successful result twice.
export async function scanQuestions(
  questions: Question[],
  options: {
    signal: AbortSignal;
    completed?: Set<string>;
    suggest?: (questions: Question[], signal: AbortSignal) => Promise<AiSuggestion[]>;
    apply: (
      question: Question,
      suggestion: AiSuggestion,
      signal: AbortSignal,
    ) => Promise<void> | void;
    onOutcome: (outcome: ClassificationOutcome) => void;
    onProgress?: (progress: ScanProgress) => void;
    wait?: typeof waitForQuota;
  },
) {
  const { signal } = options;
  const remaining = questions.filter((q) => !options.completed?.has(q.id));
  let processed = 0;
  const progress = (waiting = false) =>
    options.onProgress?.({ processed, total: remaining.length, waiting });
  const finish = (
    q: Question,
    state: ClassificationOutcome['state'],
    reason: string,
    number = q.number,
  ) => {
    options.onOutcome({ id: q.id, label: q.label, state, reason, number });
    processed++;
    progress();
  };
  const batches: Question[][] = [];
  let batch: Question[] = [],
    chars = 0;
  for (const q of remaining) {
    if (signal.aborted) throw aborted();
    if (
      !q.statementRaw.trim() ||
      q.statementRaw.length > 20_000 ||
      (q.sourceLength || 0) > 20_000
    ) {
      finish(
        q,
        'failed',
        'Nguồn trống hoặc vượt 20.000 ký tự; cần xử lý riêng, không bị cắt để gửi AI.',
      );
      continue;
    }
    if (batch.length === 10 || chars + q.statementRaw.length > 80_000) {
      batches.push(batch);
      batch = [];
      chars = 0;
    }
    batch.push(q);
    chars += q.statementRaw.length;
  }
  if (batch.length) batches.push(batch);
  progress();
  for (let i = 0; i < batches.length; i++) {
    if (signal.aborted) throw aborted();
    const current = batches[i];
    let suggestions: AiSuggestion[];
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          suggestions = await (options.suggest || apiService.suggestQuestionTopics)(
            current,
            signal,
          );
          break;
        } catch (e) {
          if (signal.aborted) throw aborted();
          if ((e as { status?: number }).status !== 429 || attempt >= 2) throw e;
          progress(true);
          await (options.wait || waitForQuota)(60_000, signal);
          progress();
        }
      }
    } catch (e) {
      if (signal.aborted) throw aborted();
      for (const q of current) finish(q, 'failed', (e as Error).message);
      if ([0, 401, 403, 503].includes((e as { status?: number }).status ?? -1)) {
        for (const q of batches.slice(i + 1).flat())
          finish(
            q,
            'failed',
            'Chưa quét được vì cấu hình, phiên đăng nhập hoặc kết nối AI gặp lỗi.',
          );
        return { stopped: true };
      }
      continue;
    }
    if (signal.aborted) throw aborted();
    // Fail closed even when an adapter/proxy violates the normal server-side contract.
    if (
      suggestions.length !== current.length ||
      new Set(suggestions.map((s) => s.id)).size !== current.length ||
      current.some((q) => !suggestions.some((s) => s.id === q.id))
    ) {
      for (const q of current)
        finish(q, 'failed', 'AI trả thiếu hoặc trùng câu; chưa áp dụng phân loại của lượt này.');
      continue;
    }
    for (const q of current) {
      if (signal.aborted) throw aborted();
      const suggestion = suggestions.find((s) => s.id === q.id)!;
      const next = applySuggestion(q, suggestion);
      if ((next.topicIds?.length || 0) > 10) {
        finish(q, 'failed', 'Kết quả vượt 10 chuyên đề. Giữ nguyên phân loại cũ để bạn kiểm tra.');
        continue;
      }
      try {
        await options.apply(q, suggestion, signal);
        if (signal.aborted) throw aborted();
        const uncertainNumber = q.numberOrigin === 'order' && suggestion.number === null;
        finish(
          q,
          suggestion.topicIds.length && !uncertainNumber ? 'assigned' : 'unassigned',
          uncertainNumber
            ? `Chưa rõ dạng Câu 1–7. ${suggestion.reason}`
            : suggestion.reason || 'Chưa tìm được chuyên đề phù hợp.',
          next.number,
        );
      } catch (e) {
        if (signal.aborted) throw aborted();
        finish(q, 'failed', (e as Error).message);
      }
    }
  }
  return { stopped: false };
}
