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

export default function AutomaticImportPanel({ onChanged }: { onChanged: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null),
    reader = useRef<Worker | null>(null),
    running = useRef(false);
  const [uploading, setUploading] = useState(false),
    [message, setMessage] = useState(
      'Chỉ cần đưa file lên. AI chỉ nhận dạng, gắn chuyên đề và tự xuất bản.',
    );
  const [progress, setProgress] = useState({ received: 0, total: 0 }),
    [jobs, setJobs] = useState<AutomaticImportJob[]>([]),
    [notice, setNotice] = useState('');
  const changed = useRef(onChanged);
  changed.current = onChanged;
  const signature = useRef('');
  async function refresh() {
    try {
      const items = await apiService.getAutomaticImports();
      setJobs(items);
      const next = items.map((j) => j.id + ':' + j.published + ':' + j.skipped).join('|');
      if (signature.current && signature.current !== next) changed.current();
      signature.current = next;
    } catch {
      /* A later poll resumes automatically; HTTP auth handling remains centralized. */
    }
  }
  async function send(draft: AutomaticUploadDraft) {
    const abort = new AbortController();
    controller.current = abort;
    await sendAutomaticUpload(draft, {
      signal: abort.signal,
      onProgress: (received, total, message) => {
        setProgress({ received, total });
        setMessage(message);
      },
    });
    await refresh();
  }
  useEffect(() => {
    let live = true;
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
        if (live && (error as Error).name !== 'AbortError')
          setNotice(
            'Bản tải được giữ trên thiết bị. Hệ thống sẽ tiếp tục khi phiên đăng nhập hoạt động.',
          );
      } finally {
        running.current = false;
        if (live) setUploading(false);
      }
    }, 0);
    const polling = setInterval(() => {
      if (live) void refresh();
    }, 5000);
    return () => {
      live = false;
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
        worker.postMessage({ files, preserveSource: true });
      });
      // Derived previews duplicate drawing data; queue the original source and parsed bodies only.
      const questions = parsed.questions.map(({ rawTikzBlocks, rawImageRefs, ...q }) => q);
      if (questions.length > 10000) throw new Error('Mỗi lượt nhận tối đa 10.000 câu.');
      const draft = {
        id: crypto.randomUUID(),
        files: parsed.acceptedFiles,
        questions,
        offset: 0,
        createdAt: Date.now(),
      };
      if (parsed.fileErrors?.length) setNotice(parsed.fileErrors.join(' '));
      await send(draft);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setNotice((error as Error).message);
    } finally {
      running.current = false;
      setUploading(false);
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
        <h3>Kéo thả nguồn câu hỏi vào đây</h3>
        <p>File LaTeX (.tex). Không cần chọn chuyên đề hay bấm duyệt.</p>
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
          <Icon name="upload" size={18} />{' '}
          {uploading ? 'Đang nhận file…' : 'Tải file · AI tự xuất bản'}
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
        Giữ nguyên mã TeX, lời giải và TikZ. AI chỉ phân chuyên đề, không sửa hay chuẩn hóa nguồn.
      </p>
      {jobs.length > 0 && (
        <div className="automatic-job-list" aria-label="Tiến trình xuất bản tự động">
          {jobs.map((job) => {
            const finished = job.published + job.skipped,
              done = job.submitted && job.received === job.expected && finished === job.expected;
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
                          ? 'Đang chờ tự thử lại'
                          : 'Đang tự xuất bản'}
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
                      ? `${job.reason} Hệ thống sẽ tự thử lại.`
                      : 'Tiến trình được lưu trên máy chủ và tự tiếp tục khi bạn đóng trang.'}
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
