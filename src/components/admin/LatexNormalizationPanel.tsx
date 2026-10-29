import { useEffect, useRef, useState } from 'react';
import { apiService } from '../../services/apiService';
import type { NormalizationJob } from '../../../shared/normalization';
import Icon from '../Icons';
const pendingKey = 'deltascript-pending-latex-normalization';
interface Request {
  id: string;
  ids: string[];
  topicId: string;
}
export default function LatexNormalizationPanel({
  selection,
  topicId,
  onChanged,
  onQueued,
}: {
  selection: string[];
  topicId: string;
  onChanged: () => void;
  onQueued: () => void;
}) {
  const [jobs, setJobs] = useState<NormalizationJob[]>([]),
    [sending, setSending] = useState(false),
    [message, setMessage] = useState('');
  const mounted = useRef(true),
    running = useRef(false),
    signature = useRef(''),
    changed = useRef(onChanged);
  changed.current = onChanged;
  async function refresh() {
    try {
      const items = await apiService.getNormalizations();
      if (!mounted.current) return;
      setJobs(items);
      const next = items.map((j) => `${j.id}:${j.completed}:${j.review}:${j.skipped}`).join('|');
      if (signature.current !== next && items.some((j) => j.completed > 0)) changed.current();
      signature.current = next;
    } catch {
      /* Next poll/visibility event will retry. */
    }
  }
  async function send(request: Request) {
    if (running.current) return;
    running.current = true;
    setSending(true);
    setMessage('Đang gửi lựa chọn lên máy chủ…');
    try {
      localStorage.setItem(pendingKey, JSON.stringify(request));
      await apiService.startNormalization(request.id, request.ids, request.topicId);
      const current = localStorage.getItem(pendingKey);
      if (current && JSON.parse(current).id === request.id) localStorage.removeItem(pendingKey);
      if (mounted.current) {
        onQueued();
        setMessage(
          'Đã nhận lựa chọn. AI sẽ chuẩn hóa và lưu từng câu ở nền; bạn có thể chuyển tab hoặc đóng trang.',
        );
        await refresh();
      }
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status && status >= 400 && status < 500 && status !== 429)
        localStorage.removeItem(pendingKey);
      if (mounted.current) setMessage((error as Error).message);
    } finally {
      running.current = false;
      if (mounted.current) setSending(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const resume = () => {
      if (!mounted.current || document.visibilityState === 'hidden') return;
      void refresh();
      const pending = localStorage.getItem(pendingKey);
      if (pending && !running.current) {
        try {
          void send(JSON.parse(pending));
        } catch {
          localStorage.removeItem(pendingKey);
        }
      }
    };
    const startup = setTimeout(resume, 0),
      timer = setInterval(resume, 5000);
    for (const event of ['focus', 'online', 'pageshow']) window.addEventListener(event, resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      mounted.current = false;
      clearTimeout(startup);
      clearInterval(timer);
      for (const event of ['focus', 'online', 'pageshow'])
        window.removeEventListener(event, resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);
  return (
    <section className="surface normalization-panel" aria-label="AI chuẩn hóa LaTeX">
      <div className="review-actions">
        <button
          className="btn btn-primary"
          disabled={sending || !selection.length}
          onClick={() =>
            void send({
              id: crypto.randomUUID(),
              ids: [...selection],
              topicId: topicId === 'unassigned' ? '' : topicId,
            })
          }
        >
          <Icon name="spark" size={18} />
          {sending
            ? 'Đang gửi…'
            : `AI chuẩn hóa LaTeX${selection.length ? ` (${selection.length} câu)` : ' câu đã chọn'}`}
        </button>
      </div>
      <p className="field-help">
        Chọn chuyên đề → Chọn hết hoặc chọn từng câu → AI chuẩn hóa LaTeX. Chỉ sửa cú pháp và định
        dạng theo skill; giữ nguyên nội dung toán học, lời giải, immini và TikZ.
      </p>
      {message && (
        <p role="status" className="field-help">
          {message}
        </p>
      )}
      {jobs.map((job) => {
        const finished = job.completed + job.review + job.skipped,
          done = finished === job.expected;
        return (
          <article className="normalization-job" key={job.id}>
            <strong>{job.label}</strong>
            <span className="soft-badge">
              {done
                ? job.review
                  ? 'Hoàn tất · Có câu cần kiểm tra'
                  : 'Đã hoàn tất'
                : job.working
                  ? 'AI đang chuẩn hóa'
                  : 'Đang chờ xử lý nền'}
            </span>
            <progress
              max={job.expected}
              value={finished}
              aria-label={`Tiến độ chuẩn hóa ${job.label}`}
            />
            <p>
              Đã chuẩn hóa{' '}
              <strong>
                {job.completed} / {job.expected}
              </strong>{' '}
              câu{job.review > 0 ? ` · Giữ bản gốc ${job.review} câu cần kiểm tra` : ''}
              {job.skipped > 0 ? ` · Bỏ qua ${job.skipped} câu ngoài phạm vi` : ''}.
            </p>
            {job.reason && (
              <p className="field-help">
                {job.reason}
                {!done && job.nextAttempt && job.nextAttempt > Date.now()
                  ? ` Tự thử lại lúc ${new Date(job.nextAttempt).toLocaleTimeString('vi-VN')}.`
                  : ''}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}
