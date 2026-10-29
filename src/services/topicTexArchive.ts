import type { TopicSummary } from '../../shared/content';
import type { Question } from '../types';
import {
  buildTopicTexArchive,
  topicTexFileName,
  type TopicRestoreItem,
} from '../../shared/topicTexArchive';
import { apiService, ApiError } from './apiService';
import { uploadDrafts, uploadRetryDelay, type AutomaticUploadDraft } from './automaticUpload';

export async function downloadTopicQuestions(
  topic: Pick<TopicSummary, 'id' | 'title'>,
  onProgress?: (received: number, total: number) => void,
) {
  const ids = await apiService.getQuestionSelection({
    topicId: topic.id,
    status: 'all',
    search: '',
  });
  if (!ids.length) throw new Error('Chuyên đề chưa có câu hỏi để tải xuống.');
  const questions: Question[] = [];
  for (let at = 0; at < ids.length; at += 20) {
    questions.push(...(await apiService.getSelectedQuestions(ids.slice(at, at + 20))));
    onProgress?.(questions.length, ids.length);
  }
  if (questions.length !== ids.length)
    throw new Error('Danh sách câu hỏi vừa thay đổi. Hãy tải lại để lấy đủ nguồn của chuyên đề.');
  const content = await buildTopicTexArchive(topic, questions);
  const url = URL.createObjectURL(new Blob([content], { type: 'text/x-tex;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = topicTexFileName(topic.title);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return questions.length;
}
export function uniqueTopicRestores(questions: Question[]) {
  const result = new Map<string, Question>();
  for (const q of questions) {
    if (!q.topicRestore) continue;
    const old = result.get(q.topicRestore.questionId);
    if (
      old &&
      (old.raw !== q.raw ||
        old.latexPreamble !== q.latexPreamble ||
        old.topicRestore!.revision !== q.topicRestore.revision)
    )
      throw new Error(
        'Có nhiều bản sửa khác nhau của cùng một câu. Hãy nhập từng file riêng để tránh ghi đè.',
      );
    if (!old) result.set(q.topicRestore.questionId, q);
  }
  return [...result.values()];
}
export async function sendTopicRestore(
  draft: AutomaticUploadDraft,
  options: {
    signal: AbortSignal;
    onProgress: (received: number, total: number, message: string) => void;
  },
) {
  const total = draft.questions.length;
  await uploadDrafts.put(draft);
  while (draft.offset < total) {
    if (options.signal.aborted) throw new DOMException('Đã tạm dừng nhập lại file.', 'AbortError');
    const items: TopicRestoreItem[] = [];
    let bytes = 0;
    for (const q of draft.questions.slice(draft.offset, draft.offset + 10)) {
      const info = q.topicRestore;
      if (!info) throw new Error('Thiếu thông tin câu gốc của file.');
      const item = {
        id: info.questionId,
        topicId: info.topicId,
        revision: info.revision,
        raw: q.raw || '',
        latexPreamble: q.latexPreamble || '',
      };
      const size = new TextEncoder().encode(JSON.stringify(item)).length;
      if (items.length && bytes + size > 1400000) break;
      items.push(item);
      bytes += size;
    }
    for (let attempt = 0; ; attempt++) {
      if (options.signal.aborted)
        throw new DOMException('Đã tạm dừng nhập lại file.', 'AbortError');
      try {
        await apiService.restoreTopicQuestions(items);
        break;
      } catch (error) {
        const status = (error as ApiError).status;
        if (status && status >= 400 && status < 500 && ![408, 429].includes(status)) {
          await uploadDrafts.remove(draft.id);
          throw new Error(`Đã xác nhận ${draft.offset}/${total} câu. ${(error as Error).message}`);
        }
        options.onProgress(
          draft.offset,
          total,
          'Đường truyền gián đoạn; file được giữ lại để tự cập nhật tiếp.',
        );
        await uploadRetryDelay(Math.min(60000, 2000 * 2 ** Math.min(attempt, 5)), options.signal);
      }
    }
    draft = { ...draft, offset: draft.offset + items.length };
    await uploadDrafts.put(draft);
    options.onProgress(
      draft.offset,
      total,
      `Đã xác nhận ${draft.offset}/${total} câu gốc; giữ nguyên chuyên đề và trạng thái xuất bản.`,
    );
  }
  await uploadDrafts.remove(draft.id);
  options.onProgress(
    total,
    total,
    `Đã nhập lại ${total} câu gốc và lưu các thay đổi. Giữ nguyên chuyên đề, trạng thái xuất bản; không tạo câu hỏi trùng.`,
  );
  return draft.id;
}
