import { useEffect, useRef, useState } from 'react';
import { apiService } from '../../services/apiService';
import { scanQuestions, type ClassificationOutcome } from '../../services/autoClassify';

export default function AiBankScan({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const checkpoint = useRef({ cutoff: '', cursor: '', complete: false });
  const results = useRef(new Map<string, ClassificationOutcome>());
  const completed = useRef(new Set<string>());
  const assignedIds = useRef(new Set<string>());
  const failedIds = useRef(new Set<string>());
  const exceptions = useRef(new Map<string, ClassificationOutcome>());
  const [stats, setStats] = useState({ processed: 0, assigned: 0, needsReview: 0, failed: 0 });
  const running = useRef(false);
  const [busy, setBusy] = useState(true);
  const [total, setTotal] = useState(0);
  const [outcomes, setOutcomes] = useState<ClassificationOutcome[]>([]);
  const [status, setStatus] = useState('Đang chuẩn bị quét toàn bộ kho…');
  const [error, setError] = useState('');
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    // Defer startup so React StrictMode's rehearsal never launches a paid request twice.
    const timer = setTimeout(() => void run(), 0);
    const protect = (event: BeforeUnloadEvent) => {
      if (running.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
      dialog.current?.close();
      window.removeEventListener('beforeunload', protect);
      previousFocus.current?.focus();
    };
  }, []);
  async function run() {
    if (running.current || checkpoint.current.complete) return;
    running.current = true;
    setBusy(true);
    setError('');
    const abort = new AbortController();
    controller.current = abort;
    try {
      const settings = await apiService.getAiSettings();
      if (abort.signal.aborted) return;
      if (!settings.hasKey)
        throw new Error('Hãy lưu API key và model trong Cấu hình AI trước khi quét.');
      if (!(await apiService.getTopics()).length)
        throw new Error('Hãy tạo chuyên đề trước khi quét.');
      while (!abort.signal.aborted) {
        const page = await apiService.getAiScanPage(
          checkpoint.current.cutoff,
          checkpoint.current.cursor,
          abort.signal,
        );
        checkpoint.current.cutoff = page.cutoff;
        if (page.total !== undefined) setTotal(page.total);
        const scanned = await scanQuestions(page.items, {
          signal: abort.signal,
          completed: completed.current,
          apply: async (question, suggestion, signal) => {
            // Add only topic links. The source, answer, existing type and publication stay intact.
            if (suggestion.topicIds.length)
              await apiService.classifyQuestions(
                [question.id],
                { topicIds: suggestion.topicIds, mode: 'add' },
                signal,
              );
          },
          onOutcome: (outcome) => {
            results.current.set(outcome.id, outcome);
            if (outcome.state !== 'failed') completed.current.add(outcome.id);
            if (outcome.state === 'assigned') {
              assignedIds.current.add(outcome.id);
              exceptions.current.delete(outcome.id);
            } else {
              assignedIds.current.delete(outcome.id);
              exceptions.current.set(outcome.id, outcome);
            }
            if (outcome.state === 'failed') failedIds.current.add(outcome.id);
            else failedIds.current.delete(outcome.id);
            const visible: ClassificationOutcome[] = [];
            for (const item of exceptions.current.values()) {
              visible.push(item);
              if (visible.length === 50) break;
            }
            setOutcomes(visible);
            setStats({
              processed: results.current.size,
              assigned: assignedIds.current.size,
              needsReview: exceptions.current.size,
              failed: failedIds.current.size,
            });
          },
          onProgress: (progress) =>
            setStatus(
              progress.waiting
                ? 'Đang chờ hạn mức AI, sẽ tự tiếp tục sau một phút…'
                : `Đã xử lý ${results.current.size} câu. Đang tự nhận dạng và gắn chuyên đề…`,
            ),
        });
        if (abort.signal.aborted) break;
        // A configuration/network failure leaves this page retryable; never advance past it.
        if (scanned.stopped) {
          throw new Error(
            'Có lượt chưa quét được. Bấm tiếp tục để thử lại; các câu đã thành công được giữ nguyên.',
          );
        }
        if (!page.nextCursor) {
          checkpoint.current.complete = true;
          break;
        }
        checkpoint.current.cursor = page.nextCursor;
      }
      setStatus(
        abort.signal.aborted
          ? 'Đã dừng. Các câu đã gắn chuyên đề được giữ nguyên.'
          : 'Đã quét hết kho tại thời điểm bắt đầu. Các câu phù hợp đã được tự gắn vào chuyên đề có sẵn.',
      );
    } catch (e) {
      if (abort.signal.aborted) setStatus('Đã dừng. Bấm tiếp tục để quét phần còn lại.');
      else {
        setError((e as Error).message);
        setStatus('Quét chưa hoàn tất.');
      }
    } finally {
      running.current = false;
      setBusy(false);
      onChanged();
    }
  }
  const assigned = stats.assigned;
  const needsReview = outcomes.filter((o) => o.state !== 'assigned');
  function exportReport() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { total, processed: stats.processed, outcomes: [...results.current.values()] },
            null,
            2,
          ),
        ],
        {
          type: 'application/json',
        },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ket-qua-quet-ai.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <dialog
      ref={dialog}
      className="preview-dialog ai-bank-scan-dialog"
      aria-labelledby="bank-scan-title"
      onCancel={(event) => {
        event.preventDefault();
        if (busy) controller.current?.abort();
        else onClose();
      }}
    >
      <div className="preview-heading">
        <h2 id="bank-scan-title">AI quét toàn bộ kho</h2>
        <button className="icon-button" aria-label="Đóng quét AI" disabled={busy} onClick={onClose}>
          ×
        </button>
      </div>
      <div className="preview-body">
        <p>
          Quét mọi dạng câu và mọi trang, gồm bản nháp và bài đã xuất bản. Kết quả phù hợp được tự
          gắn thêm vào các chuyên đề đã có. Câu chưa khớp được liệt kê để kiểm tra.
        </p>
        <p className="notice notice-success" role="status">
          {status}
        </p>
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <progress aria-label="Tiến độ quét kho" max={Math.max(total, 1)} value={stats.processed} />
        <div className="scan-counts">
          <span>
            Đã quét{' '}
            <strong>
              {stats.processed} / {total}
            </strong>
          </span>
          <span>
            Đã phân loại <strong>{assigned}</strong>
          </span>
          <span>
            Cần kiểm tra <strong>{stats.needsReview}</strong>
          </span>
        </div>
        <p className="field-help">
          Giữ cửa sổ này mở trong lúc quét. Có thể dừng và tiếp tục; API được gọi theo từng lượt để
          xử lý hạn mức.
        </p>
        {needsReview.length > 0 && (
          <section className="scan-exceptions">
            <h3>Câu cần kiểm tra</h3>
            <ul>
              {needsReview.slice(0, 50).map((item) => (
                <li key={item.id}>
                  <strong>{item.label}</strong> — {item.reason}
                </li>
              ))}
            </ul>
            {stats.needsReview > 50 && <p>Hiện 50 câu đầu. Tải báo cáo để xem đầy đủ.</p>}
          </section>
        )}
      </div>
      <div className="preview-footer">
        {stats.processed > 0 && (
          <button className="btn btn-quiet" onClick={exportReport}>
            Tải báo cáo
          </button>
        )}
        {busy ? (
          <button className="btn btn-secondary" onClick={() => controller.current?.abort()}>
            Dừng quét
          </button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={onClose}>
              Đóng
            </button>
            {!checkpoint.current.complete && (
              <button className="btn btn-primary" onClick={() => void run()}>
                Tiếp tục quét
              </button>
            )}
            {checkpoint.current.complete && stats.failed > 0 && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  checkpoint.current.complete = false;
                  checkpoint.current.cursor = '';
                  void run();
                }}
              >
                Thử lại các câu lỗi
              </button>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
