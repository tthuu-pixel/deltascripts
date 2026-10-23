import type { Question } from '../types';
import type { AiSuggestion } from '../../shared/ai';
import type { TopicSummary } from '../../shared/content';
import { inspectTex, normalizeQuestion } from '../../shared/importReview';
import { apiService } from './apiService';
import { applySuggestion, scanQuestions, type ScanProgress } from './autoClassify';

export interface AutoImportOutcome {
  id: string;
  label: string;
  state: 'saved' | 'needs-review' | 'failed';
  reason: string;
}
export interface AutoImportProgress extends ScanProgress {
  saved: number;
  needsReview: number;
  failed: number;
}
const aborted = () => new DOMException('Đã dừng nhập tự động.', 'AbortError');
const globalFailure = (error: unknown) => {
  const status = (error as { status?: number }).status;
  return (
    status === undefined ||
    status === 0 ||
    status === 401 ||
    status === 403 ||
    status === 429 ||
    status >= 500
  );
};

export function autoImportIssue(
  question: Question,
  topics: ReadonlySet<string>,
  checkClassification = true,
): string {
  if (!question.statementRaw.trim()) return 'Thiếu đề bài.';
  if (question.sourceType === 'tex') {
    const errors = [
      ...inspectTex(question.statementRaw),
      ...inspectTex(question.solutionRaw),
    ].filter((issue) => issue.severity === 'error');
    if (errors.length)
      return errors.map((issue) => `Dòng ${issue.line}: ${issue.message}`).join(' ');
  }
  if (new TextEncoder().encode(JSON.stringify(question)).length > 1_400_000)
    return 'Nguồn hoặc ảnh của câu này quá lớn; cần giảm kích thước trước khi thêm.';
  if (!checkClassification) return '';
  if (!question.topicIds?.length) return 'Chưa tìm được chuyên đề phù hợp trong danh sách hiện có.';
  if (question.topicIds.length > 10 || question.topicIds.some((id) => !topics.has(id)))
    return 'Chuyên đề không còn tồn tại hoặc vượt giới hạn 10 chuyên đề.';
  return '';
}

// Writes only complete, validated questions. Stable input IDs make a lost acknowledgement
// safe to retry. An in-flight write is allowed to finish and be acknowledged before stopping.
export async function runAutoImport(
  input: Question[],
  options: {
    topics: TopicSummary[];
    signal: AbortSignal;
    topicIds?: string[];
    published: boolean;
    resolvedIds?: ReadonlySet<string>;
    suggest?: (questions: Question[], signal: AbortSignal) => Promise<AiSuggestion[]>;
    save?: (questions: Question[]) => Promise<unknown>;
    onQuestion: (question: Question) => void;
    onSaved: (questions: Question[]) => void;
    onOutcome: (outcome: AutoImportOutcome) => void;
    onProgress?: (progress: AutoImportProgress) => void;
  },
) {
  const { signal } = options;
  const allowed = new Set(options.topics.map((topic) => topic.id));
  const results = new Map<string, AutoImportOutcome>();
  const prepared: Question[] = [];
  const known: Question[] = [];
  let stopped = false;
  const progress = (waiting = false) =>
    options.onProgress?.({
      processed: results.size,
      total: input.length,
      waiting,
      saved: [...results.values()].filter((result) => result.state === 'saved').length,
      needsReview: [...results.values()].filter((result) => result.state === 'needs-review').length,
      failed: [...results.values()].filter((result) => result.state === 'failed').length,
    });
  function finish(q: Question, state: AutoImportOutcome['state'], reason: string) {
    const outcome = { id: q.id, label: q.label, state, reason };
    results.set(q.id, outcome);
    options.onOutcome(outcome);
    progress();
  }
  function checkStopped() {
    if (signal.aborted) throw aborted();
  }
  async function saveBatch(batch: Question[]): Promise<void> {
    if (!batch.length) return;
    checkStopped();
    try {
      await (options.save || apiService.saveQuestions)(batch);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (batch.length > 1 && [400, 409, 413, 422].includes(status || 0)) {
        const middle = Math.ceil(batch.length / 2);
        await saveBatch(batch.slice(0, middle));
        if (!stopped) await saveBatch(batch.slice(middle));
        return;
      }
      for (const q of batch)
        finish(
          q,
          [400, 409, 413, 422].includes(status || 0) ? 'needs-review' : 'failed',
          `Chưa xác nhận được việc lưu: ${(error as Error).message}`,
        );
      if (globalFailure(error)) stopped = true;
      return;
    }
    options.onSaved(batch);
    for (const q of batch)
      finish(
        q,
        'saved',
        options.published ? 'Đã thêm và xuất bản.' : 'Đã thêm vào kho ở trạng thái nháp.',
      );
  }
  async function saveReady(ready: Question[]) {
    let batch: Question[] = [],
      bytes = 0;
    for (const q of ready) {
      const size = new TextEncoder().encode(JSON.stringify(q)).length;
      if (batch.length && (batch.length === 100 || bytes + size > 1_400_000)) {
        await saveBatch(batch);
        batch = [];
        bytes = 0;
        if (stopped) break;
      }
      batch.push(q);
      bytes += size;
    }
    if (!stopped) await saveBatch(batch);
  }
  try {
    for (const source of input) {
      checkStopped();
      try {
        const q = normalizeQuestion(source).question;
        q.topicIds = [...new Set([...(q.topicIds || []), ...(options.topicIds || [])])];
        q.published = options.published;
        options.onQuestion(q);
        const issue = autoImportIssue(q, allowed, false);
        if (issue) {
          finish(q, 'needs-review', issue);
          continue;
        }
        if (
          !autoImportIssue(q, allowed) &&
          (options.resolvedIds?.has(q.id) || options.topicIds?.length)
        )
          known.push(q);
        else prepared.push(q);
      } catch (error) {
        finish(source, 'needs-review', (error as Error).message);
      }
    }
    await saveReady(known);
    for (let at = 0; at < prepared.length && !stopped; at += 10) {
      checkStopped();
      const batch = prepared.slice(at, at + 10);
      const ready: Question[] = [];
      const classified = new Map<string, Question>();
      const scan = await scanQuestions(batch, {
        signal,
        suggest: options.suggest,
        apply: (q, suggestion) => {
          const next = applySuggestion(q, suggestion);
          classified.set(q.id, next);
          options.onQuestion(next);
        },
        onOutcome: (outcome) => {
          const q = classified.get(outcome.id) || batch.find((item) => item.id === outcome.id)!;
          const issue = autoImportIssue(q, allowed);
          if (outcome.state === 'failed') finish(q, 'failed', outcome.reason);
          else if (issue) finish(q, 'needs-review', `${issue} ${outcome.reason}`.trim());
          else ready.push(q);
        },
        onProgress: (value) => progress(value.waiting),
      });
      // Keep successes from the last successful batch even if a later AI call failed.
      await saveReady(ready);
      if (scan.stopped) stopped = true;
    }
  } catch (error) {
    if (!signal.aborted) throw error;
    stopped = true;
  }
  for (const q of input)
    if (!results.has(q.id))
      finish(
        q,
        'failed',
        signal.aborted
          ? 'Đã dừng trước khi lưu; có thể tiếp tục.'
          : 'Chưa xử lý xong do kết nối hoặc cấu hình AI; có thể tiếp tục.',
      );
  return { stopped, results: [...results.values()] };
}
