import { useEffect, useRef, useState } from 'react';
import { aiExerciseOnlyMessage } from '../../../shared/questionEnvironment';
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
  const skippedIds = useRef(new Set<string>());
  const exceptions = useRef(new Map<string, ClassificationOutcome>());
  const [stats, setStats] = useState({
    processed: 0,
    assigned: 0,
    needsReview: 0,
    failed: 0,
    skipped: 0,
  });
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
          saveRepairs: true,
          apply: async () => {
            /* Repaired code and topic links are saved atomically by the server. */
          },
          onOutcome: (outcome) => {
            results.current.set(outcome.id, outcome);
            if (outcome.state === 'assigned' || outcome.state === 'skipped')
              completed.current.add(outcome.id);
            if (outcome.state === 'assigned' || outcome.state === 'skipped') {
              if (outcome.state === 'assigned') assignedIds.current.add(outcome.id);
              else assignedIds.current.delete(outcome.id);
              exceptions.current.delete(outcome.id);
            } else {
              assignedIds.current.delete(outcome.id);
              exceptions.current.set(outcome.id, outcome);
            }
            if (outcome.state === 'skipped') skippedIds.current.add(outcome.id);
            else skippedIds.current.delete(outcome.id);
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
              skipped: skippedIds.current.size,
            });
          },
          onProgress: (progress) =>
            setStatus(
              progress.waiting
                ? 'Đang chờ hạn mức AI, sẽ tự tiếp tục sau một phút…'
                : `Đã xử lý ${results.current.size} câu. Đang tự sửa mã, kiểm tra và chọn chuyên đề…`,
            ),
        });
        if (abort.signal.aborted) break;
        // A configuration/network failure leaves this page retryable; never advance past it.
        if (scanned.stopped) {
          throw new Error(scanned.reason || 'AI đã tạm dừng. Các câu đã xử lý được giữ nguyên.');
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
          : 'Đã quét hết kho tại thời điểm bắt đầu. Các câu xử lý thành công đã được sửa mã và lưu vào chuyên đề.',
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
          Dựa vào mô tả ngắn của mỗi chuyên đề để quét mọi câu trên mọi trang, gồm bản nháp và bài
          đã xuất bản. AI tự sửa mã, kiểm tra lời giải và lưu chuyên đề phù hợp. Nguồn trước khi sửa
          được lưu lại.
        </p>
        <p className="field-help">{aiExerciseOnlyMessage}</p>
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
            Chờ xử lý lại <strong>{stats.needsReview}</strong>
          </span>
          <span>
            Ngoài phạm vi tự luận <strong>{stats.skipped}</strong>
          </span>
        </div>
        <p className="field-help">
          Giữ cửa sổ này mở trong lúc quét. Có thể dừng và tiếp tục; API được gọi theo từng lượt để
          xử lý hạn mức.
        </p>
        {needsReview.length > 0 && (
          <p className="field-help">
            Các câu chưa hoàn tất được giữ nguồn và có thể thử lại. Xem chi tiết trong báo cáo khi
            cần.
          </p>
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
                AI tiếp tục xử lý
              </button>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
