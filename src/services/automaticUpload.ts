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
const memory = new Map<string, AutomaticUploadDraft>();
const volatile = new Set<string>();
let retryStorageAt = 0;
export const hasVolatileUploads = () => volatile.size > 0;
function storageChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('upload-storage-change'));
}
async function localStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  if (Date.now() < retryStorageAt) throw new Error('Bộ nhớ thiết bị chưa sẵn sàng.');
  return new Promise<T>((resolve, reject) => {
    let settled = false,
      db: IDBDatabase | undefined,
      tx: IDBTransaction | undefined;
    const finish = (error?: unknown, result?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        retryStorageAt = Date.now() + 30000;
        try {
          tx?.abort();
        } catch {
          /* The transaction may already be complete. */
        }
      }
      db?.close();
      error ? reject(error) : resolve(result!);
    };
    const timer = setTimeout(() => finish(new Error('Bộ nhớ thiết bị phản hồi chậm.')), 2000);
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(database, 1);
    } catch (error) {
      finish(error);
      return;
    }
    request.onupgradeneeded = () => request.result.createObjectStore('uploads', { keyPath: 'id' });
    request.onerror = () => finish(request.error || new Error('Không mở được bộ nhớ thiết bị.'));
    request.onblocked = () => finish(new Error('Bộ nhớ thiết bị đang bị khóa.'));
    request.onsuccess = () => {
      db = request.result;
      if (settled) {
        db.close();
        return;
      }
      try {
        tx = db.transaction('uploads', mode);
        const action = operation(tx.objectStore('uploads'));
        tx.oncomplete = () => finish(undefined, action.result);
        tx.onerror = tx.onabort = () =>
          finish(tx?.error || action.error || new Error('Không lưu được bản tải.'));
      } catch (error) {
        finish(error);
      }
    };
  });
}
export const uploadDrafts = {
  async all(): Promise<AutomaticUploadDraft[]> {
    let saved: AutomaticUploadDraft[] = [];
    try {
      saved = await localStore('readonly', (s) => s.getAll());
    } catch {
      /* Sending can continue from memory. */
    }
    return [...new Map([...saved.map((d) => [d.id, d] as const), ...memory]).values()];
  },
  async put(draft: AutomaticUploadDraft) {
    memory.set(draft.id, draft);
    try {
      await localStore('readwrite', (s) => s.put(draft));
      volatile.delete(draft.id);
    } catch {
      volatile.add(draft.id);
    }
    storageChanged();
  },
  async remove(id: string) {
    memory.delete(id);
    volatile.delete(id);
    storageChanged();
    try {
      await localStore('readwrite', (s) => s.delete(id));
    } catch {
      /* Server receipts make any later replay idempotent. */
    }
  },
  async clear() {
    memory.clear();
    volatile.clear();
    storageChanged();
    try {
      await localStore('readwrite', (s) => s.clear());
    } catch {
      /* Cleared generations are also rejected by the server. */
    }
  },
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
  options.onProgress(draft.offset, total, 'Đang lưu tạm bản tải trên thiết bị…');
  await storage.put(draft);
  options.onProgress(draft.offset, total, 'Đang kết nối để bắt đầu gửi file…');
  await reliable(() =>
    api.startAutomaticImport(draft.id, draft.files, total, draft.generation || 0),
  );
  while (draft.offset < total) {
    const batch: Question[] = [];
    let bytes = 0;
    for (const q of draft.questions.slice(draft.offset, draft.offset + 5)) {
      const size = new TextEncoder().encode(JSON.stringify(q)).length;
      if (batch.length && bytes + size > 64000) break;
      batch.push(q);
      bytes += size;
    }
    options.onProgress(
      draft.offset,
      total,
      `Đang gửi câu ${draft.offset + 1}–${draft.offset + batch.length} / ${total} lên máy chủ…`,
    );
    await reliable(() => api.appendAutomaticImport(draft.id, batch, draft.generation || 0));
    draft = { ...draft, offset: draft.offset + batch.length };
    await storage.put(draft);
    options.onProgress(draft.offset, total, 'Đang chuyển nguồn lên máy chủ…');
  }
  options.onProgress(draft.offset, total, 'Đang xác nhận máy chủ đã nhận đủ file…');
  await reliable(() => api.finishAutomaticImport(draft.id, draft.generation || 0));
  await storage.remove(draft.id);
  options.onProgress(
    total,
    total,
    'Máy chủ đã nhận đủ. AI sẽ tự phân chuyên đề và xuất bản; bạn có thể đóng trang.',
  );
  return draft.id;
}
