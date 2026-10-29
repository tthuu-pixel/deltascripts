import { useEffect, useRef, useState } from 'react';
import type { Question } from '../../types';
import type { AutomaticImportJob } from '../../../shared/automaticImport';
import { apiService } from '../../services/apiService';
import {
  sendAutomaticUpload,
  uploadDrafts,
  type AutomaticUploadDraft,
} from '../../services/automaticUpload';
import Icon from '../Icons';
import { sendTopicRestore, uniqueTopicRestores } from '../../services/topicTexArchive';

export default function AutomaticImportPanel({ onChanged }: { onChanged: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null),
    reader = useRef<Worker | null>(null),
    running = useRef(false);
  const [clearing, setClearing] = useState(false);
  const [uploading, setUploading] = useState(false),
    [message, setMessage] = useState(
      'Chỉ cần đưa file lên. AI chỉ nhận dạng, gắn chuyên đề và tự xuất bản.',
    );
  const [progress, setProgress] = useState({ received: 0, total: 0 }),
    [jobs, setJobs] = useState<AutomaticImportJob[]>([]),
    [notice, setNotice] = useState(''),
    [now, setNow] = useState(Date.now());
  const mounted = useRef(true);
  const changed = useRef(onChanged);
  changed.current = onChanged;
  const signature = useRef('');
  async function refresh() {
    try {
      const { items, generation } = await apiService.getAutomaticImportState();
      try {
        for (const draft of await uploadDrafts.all())
          if (draft.kind !== 'topic-restore' && (draft.generation || 0) < generation)
            await uploadDrafts.remove(draft.id);
      } catch {
        /* Server generation also prevents stale replay if local storage is unavailable. */
      }
      if (!mounted.current) return;
      setNow(Date.now());
      setJobs(items);
      const next = items.map((j) => j.id + ':' + j.published + ':' + j.skipped).join('|');
      if (signature.current !== next && (signature.current || items.some((j) => j.published > 0)))
        changed.current();
      signature.current = next;
    } catch {
      /* A later poll resumes automatically; HTTP auth handling remains centralized. */
    }
  }
  async function send(draft: AutomaticUploadDraft) {
    const abort = new AbortController();
    controller.current = abort;
    try {
      await (draft.kind === 'topic-restore' ? sendTopicRestore : sendAutomaticUpload)(draft, {
        signal: abort.signal,
        onProgress: (received, total, message) => {
          setProgress({ received, total });
          setMessage(message);
        },
      });
    } finally {
      if (draft.kind === 'topic-restore' && mounted.current) changed.current();
      await refresh();
    }
  }

  useEffect(() => {
    let live = true;
    mounted.current = true;
    const timer = setTimeout(async () => {
      await refresh();
      if (!live || running.current) return;
      running.current = true;
      try {
        const drafts = await uploadDrafts.all();
        if (!live) return;
        if (drafts.length) setUploading(true);
        for (const draft of drafts.sort((a, b) => a.createdAt - b.createdAt)) {
          if (!live) break;
          await send(draft);
        }
      } catch (error) {
        if (live && (error as Error).name !== 'AbortError') setNotice((error as Error).message);
      } finally {
        running.current = false;
        if (live) setUploading(false);
      }
    }, 0);
    const resume = () => {
      if (live && document.visibilityState !== 'hidden') void refresh();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    window.addEventListener('pageshow', resume);
    const polling = setInterval(resume, 5000);
    const clock = setInterval(() => {
      if (live && document.visibilityState !== 'hidden') setNow(Date.now());
    }, 1000);
    return () => {
      live = false;
      mounted.current = false;
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      window.removeEventListener('pageshow', resume);
      clearInterval(clock);
      clearTimeout(timer);
      clearInterval(polling);
      controller.current?.abort();
      reader.current?.terminate();
    };
  }, []);
  async function upload(files: File[]) {
    if (!files.length || running.current) return;
    if (files.length > 100) {
      setNotice('Mỗi lượt nhận tối đa 100 tệp.');
      return;
    }
    running.current = true;
    setUploading(true);
    setNotice('');
    setMessage('Đang đọc và giữ lại nguồn tệp…');
    setProgress({ received: 0, total: 0 });
    try {
      const { generation } = await apiService.getAutomaticImportState();
      const parsed = await new Promise<{
        questions: Question[];
        fileErrors?: string[];
        acceptedFiles: string[];
      }>((resolve, reject) => {
        const worker = new Worker(new URL('../../parsers/import.worker.ts', import.meta.url), {
          type: 'module',
        });
        reader.current = worker;
        worker.onmessage = (event) => {
          worker.terminate();
          reader.current = null;
          event.data.error ? reject(new Error(event.data.error)) : resolve(event.data);
        };
        worker.onerror = () => {
          worker.terminate();
          reader.current = null;
          reject(new Error('Chưa đọc được nội dung tệp.'));
        };
        worker.postMessage({ files, preserveSource: true, restoreExports: true });
      });
      // Derived previews duplicate drawing data; queue the original source and parsed bodies only.
      const all = parsed.questions.map(({ rawTikzBlocks, rawImageRefs, ...q }) => q);
      if (parsed.fileErrors?.length) setNotice(parsed.fileErrors.join(' '));
      const restoring = uniqueTopicRestores(all);
      if (restoring.length) {
        await send({
          id: crypto.randomUUID(),
          files: parsed.acceptedFiles,
          questions: restoring,
          offset: 0,
          createdAt: Date.now(),
          kind: 'topic-restore',
        });
      }
      const questions = all.filter((q) => !q.topicRestore);
      if (!questions.length) return;
      if (questions.length > 10000) throw new Error('Mỗi lượt nhận tối đa 10.000 câu.');
      const draft = {
        id: crypto.randomUUID(),
        files: parsed.acceptedFiles,
        questions,
        offset: 0,
        createdAt: Date.now(),
        generation,
      };
      await send(draft);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setNotice((error as Error).message);
    } finally {
      running.current = false;
      setUploading(false);
    }
  }
  async function clearImports() {
    if (
      clearing ||
      uploading ||
      !confirm(
        'Xóa danh sách nhập và hủy các lượt còn chờ? Các câu đã lưu trong kho được giữ nguyên.',
      )
    )
      return;
    setClearing(true);
    try {
      await apiService.clearAutomaticImports();
      controller.current?.abort();
      try {
        for (const draft of await uploadDrafts.all())
          if (draft.kind !== 'topic-restore') await uploadDrafts.remove(draft.id);
      } catch {
        /* Old generations are also rejected by the server. */
      }
      signature.current = '';
      setJobs([]);
      setMessage('Đã xóa danh sách nhập. Các câu đã lưu trong kho được giữ nguyên.');
      await refresh();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setClearing(false);
    }
  }
  return (
    <section className="surface automatic-publish-panel" aria-label="Tải file để AI tự xuất bản">
      <span className="section-kicker">TẢI FILE LÀ XONG</span>
      <h2>AI lo phần còn lại</h2>
      <p>Đọc file → nhận dạng chuyên đề → tự gắn và xuất bản.</p>
      <div
        className="import-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!uploading) void upload(Array.from(e.dataTransfer.files));
        }}
      >
        <span className="icon-tile tone-blue">
          <Icon name="spark" size={32} />
        </span>
        <h3>Nhập nguồn câu hỏi từ file TeX</h3>
        <p>Nhấn nút bên dưới để chọn file .tex, hoặc kéo thả file vào đây.</p>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept=".tex"
          multiple
          aria-label="Tải file để AI tự xuất bản"
          disabled={uploading}
          onChange={(e) => {
            void upload(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
        <button
          className="btn btn-primary"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="upload" size={18} /> {uploading ? 'Đang nhập file…' : 'Nhập file TeX (.tex)'}
        </button>
      </div>
      <p className="notice automatic-upload-status" role="status">
        {message}
      </p>
      {uploading && progress.total > 0 && (
        <>
          <progress max={progress.total} value={progress.received} aria-label="Tiến độ gửi file" />
          <p>
            Đã gửi {progress.received} / {progress.total} câu.
          </p>
        </>
      )}
      {notice && (
        <p className="field-help" role="status">
          {notice}
        </p>
      )}
      <p className="field-help">
        Giữ nguyên mã TeX, lời giải và TikZ. AI chỉ phân chuyên đề khi nhập nguồn mới. File tải từ
        chuyên đề nhập lại sẽ cập nhật câu gốc; giữ các dòng DELTASCRIPT trong file.
      </p>
      {jobs.length > 0 && (
        <div className="automatic-job-list" aria-label="Tiến trình xuất bản tự động">
          <button
            className="btn btn-danger"
            disabled={clearing || uploading}
            onClick={() => void clearImports()}
          >
            <Icon name="trash" size={18} />
            {clearing ? 'Đang xóa…' : 'Xóa danh sách nhập'}
          </button>
          <p className="field-help">
            Xóa các lượt nhập ở cột này, hủy phần còn chờ; giữ nguyên câu hỏi đã lưu.
          </p>
          {jobs.map((job) => {
            const finished = job.published + job.skipped,
              done = job.submitted && job.received === job.expected && finished === job.expected;
            const retryTime =
              job.nextAttempt && job.nextAttempt > now
                ? new Date(job.nextAttempt).toLocaleTimeString('vi-VN')
                : '';
            return (
              <article className={`automatic-job ${done ? 'is-complete' : ''}`} key={job.id}>
                <strong>{job.files.join(', ')}</strong>
                <span className="soft-badge">
                  {done
                    ? 'Đã hoàn tất'
                    : job.received < job.expected
                      ? 'Đang nhận nguồn'
                      : job.working
                        ? 'AI đang xử lý'
                        : job.reason
                          ? retryTime
                            ? `Tự thử lại lúc ${retryTime}`
                            : 'Đang chờ máy chủ thử lại'
                          : 'Đã xếp hàng trên máy chủ'}
                </span>
                <progress
                  max={Math.max(job.expected, 1)}
                  value={finished}
                  aria-label={`Tiến độ ${job.files.join(', ')}`}
                />
                <p>
                  Đã xử lý{' '}
                  <strong>
                    {finished} / {job.expected}
                  </strong>{' '}
                  · Đã xuất bản <strong>{job.publishedQuestions}</strong> câu.
                </p>
                {job.skipped > 0 && (
                  <p className="field-help">{job.skipped} câu không thuộc phạm vi tự luận.</p>
                )}
                {!done && (
                  <p className="field-help">
                    {job.reason
                      ? `${job.reason} ${retryTime ? `Lượt tiếp theo lúc ${retryTime}.` : 'Máy chủ sẽ nhận lại trong lượt xử lý nền tiếp theo.'}`
                      : 'Máy chủ tự xử lý nền, kể cả khi bạn chuyển tab hoặc đóng trang. Lượt mới bắt đầu trong khoảng một phút.'}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
