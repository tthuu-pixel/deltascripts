import type { Question } from '../types';
import { apiService } from './apiService';
export interface AutomaticUploadDraft {
  id: string;
  files: string[];
  questions: Question[];
  offset: number;
  createdAt: number;
  generation?: number;
  kind?: 'topic-restore';
}
const database = 'deltascript-automatic-uploads';
async function localStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('uploads', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('uploads', mode);
      const request = operation(tx.objectStore('uploads'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || request.error);
    });
  } finally {
    db.close();
  }
}
export const uploadDrafts = {
  all: () => localStore('readonly', (s) => s.getAll()) as Promise<AutomaticUploadDraft[]>,
  put: (draft: AutomaticUploadDraft) => localStore('readwrite', (s) => s.put(draft)),
  remove: (id: string) => localStore('readwrite', (s) => s.delete(id)),
  clear: () => localStore('readwrite', (s) => s.clear()),
};
const stopped = () => new DOMException('Đã tạm dừng gửi file.', 'AbortError');
export function uploadRetryDelay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(stopped());
    const stop = () => {
      clearTimeout(timer);
      reject(stopped());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', stop);
      resolve();
    }, ms);
    signal.addEventListener('abort', stop, { once: true });
  });
}
export async function sendAutomaticUpload(
  draft: AutomaticUploadDraft,
  options: {
    signal: AbortSignal;
    onProgress: (received: number, total: number, message: string) => void;
    api?: Pick<
      typeof apiService,
      'startAutomaticImport' | 'appendAutomaticImport' | 'finishAutomaticImport'
    >;
    store?: {
      put(draft: AutomaticUploadDraft): Promise<unknown>;
      remove(id: string): Promise<unknown>;
    };
    wait?: typeof uploadRetryDelay;
  },
) {
  const api = options.api || apiService,
    storage = options.store || uploadDrafts;
  const total = draft.questions.length;
  async function reliable(work: () => Promise<unknown>) {
    for (let attempts = 0; ; attempts++) {
      if (options.signal.aborted) throw stopped();
      try {
        return await work();
      } catch (error) {
        if ((error as { status?: number }).status === 410) {
          await storage.remove(draft.id);
          throw error;
        }
        if (options.signal.aborted) throw stopped();
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500 && ![408, 409, 429].includes(status))
          throw error;
        options.onProgress(
          draft.offset,
          total,
          'Đường truyền đang gián đoạn; bản tải được giữ lại và sẽ tự gửi tiếp.',
        );
        await (options.wait || uploadRetryDelay)(
          Math.min(60000, 2000 * 2 ** Math.min(attempts, 5)),
          options.signal,
        );
      }
    }
  }
  await storage.put(draft);
  await reliable(() =>
    api.startAutomaticImport(draft.id, draft.files, total, draft.generation || 0),
  );
  while (draft.offset < total) {
    const batch: Question[] = [];
    let bytes = 0;
    for (const q of draft.questions.slice(draft.offset, draft.offset + 15)) {
      const size = new TextEncoder().encode(JSON.stringify(q)).length;
      if (batch.length && bytes + size > 900000) break;
      batch.push(q);
      bytes += size;
    }
    await reliable(() => api.appendAutomaticImport(draft.id, batch, draft.generation || 0));
    draft = { ...draft, offset: draft.offset + batch.length };
    await storage.put(draft);
    options.onProgress(draft.offset, total, 'Đang chuyển nguồn lên máy chủ…');
  }
  await reliable(() => api.finishAutomaticImport(draft.id, draft.generation || 0));
  await storage.remove(draft.id);
  options.onProgress(
    total,
    total,
    'Máy chủ đã nhận đủ. AI sẽ tự phân chuyên đề và xuất bản; bạn có thể đóng trang.',
  );
  return draft.id;
}
