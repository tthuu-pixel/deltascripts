import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../../types';
import type { TopicSummary } from '../../../shared/content';
import {
  inspectTex,
  normalizeQuestion,
  restoreQuestionSource,
  type NormalizationReport,
} from '../../../shared/importReview';
import { apiService } from '../../services/apiService';
import TopicPicker from './TopicPicker';
import {
  applySuggestion,
  scanQuestions,
  type ClassificationOutcome,
} from '../../services/autoClassify';

const LatexContent = lazy(() => import('../LatexContent'));
const emptyReports: Record<string, NormalizationReport> = {};
export type ReviewMode = 'import' | 'normalize' | 'classify';
export default function QuestionReview({
  questions,
  topics,
  reports = emptyReports,
  mode,
  autoClassify = false,
  onClose,
  onApply,
}: {
  questions: Question[];
  topics: TopicSummary[];
  reports?: Record<string, NormalizationReport>;
  mode: ReviewMode;
  autoClassify?: boolean;
  onClose: () => void;
  onApply: (questions: Question[]) => Promise<void>;
}) {
  const initial = useMemo(
    () =>
      questions.map((q) =>
        mode === 'normalize' ? normalizeQuestion(q) : { question: { ...q }, report: reports[q.id] },
      ),
    [questions, mode, reports],
  );
  const [drafts, setDrafts] = useState(() => initial.map((item) => item.question));
  const [changes, setChanges] = useState<Record<string, NormalizationReport>>(() =>
    Object.fromEntries(
      initial.filter((item) => item.report).map((item) => [item.question.id, item.report!]),
    ),
  );
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [source, setSource] = useState(false);
  const [busy, setBusy] = useState(autoClassify);
  const [outcomes, setOutcomes] = useState<Record<string, ClassificationOutcome>>({});
  const scanController = useRef<AbortController | null>(null);
  const completed = useRef(new Set<string>());
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      scanController.current?.abort();
      dialog.current?.close();
      previousFocus.current?.focus();
    };
  }, []);
  useEffect(() => {
    if (!autoClassify) return;
    const timer = setTimeout(() => void classify(true), 0);
    return () => {
      clearTimeout(timer);
      scanController.current?.abort();
    };
  }, [autoClassify]);
  useEffect(() => {
    dialog.current?.querySelector('.review-body')?.scrollTo({ top: 0 });
  }, [index, error]);
  const current = drafts[index];
  const report = changes[current.id];
  const issues = useMemo(
    () =>
      current.sourceType === 'tex'
        ? [
            ...inspectTex(current.statementRaw).map((i) => ({
              ...i,
              message: `Đề bài: ${i.message}`,
            })),
            ...inspectTex(current.solutionRaw).map((i) => ({
              ...i,
              message: `Lời giải: ${i.message}`,
            })),
          ]
        : [],
    [current],
  );
  function update(patch: Partial<Question>) {
    setDrafts((items) => items.map((q) => (q.id === current.id ? { ...q, ...patch } : q)));
    if (patch.number !== undefined || patch.topicIds !== undefined) {
      const next = { ...current, ...patch };
      setOutcomes((old) =>
        old[current.id]
          ? {
              ...old,
              [current.id]: {
                ...old[current.id],
                state:
                  next.number >= 1 && next.number <= 7 && !!next.topicIds?.length
                    ? 'assigned'
                    : 'unassigned',
                number: next.number,
                reason: 'Đã điều chỉnh thủ công trong bản duyệt.',
              },
            }
          : old,
      );
    }
  }
  function close() {
    if (!busy && confirm('Đóng bản duyệt? Các chỉnh sửa trong cửa sổ này chưa được áp dụng.'))
      onClose();
  }
  async function classify(automatic = false) {
    setBusy(true);
    setError('');
    const controller = new AbortController();
    scanController.current = controller;
    try {
      if (automatic) {
        setProgress('Đang chuẩn bị AI tự quét toàn bộ bản nhập…');
        const settings = await apiService.getAiSettings();
        if (controller.signal.aborted) return;
        if (!settings.hasKey) {
          setProgress(
            'Chưa có API key. Hệ thống đã tách câu và chuẩn hóa; hãy cấu hình AI để tự nhận dạng chuyên đề.',
          );
          return;
        }
      }
      if (!(automatic ? await apiService.getTopics() : topics).length) {
        setProgress('Chưa có chuyên đề. Tạo chuyên đề trước để AI tự sắp xếp câu hỏi.');
        return;
      }
      const result = await scanQuestions(drafts, {
        signal: controller.signal,
        completed: completed.current,
        apply: (question, suggestion) => {
          setReasons((old) => ({ ...old, [question.id]: suggestion.reason }));
          setDrafts((items) =>
            items.map((q) => (q.id === question.id ? applySuggestion(q, suggestion) : q)),
          );
        },
        onOutcome: (outcome) => {
          setOutcomes((old) => ({ ...old, [outcome.id]: outcome }));
          if (outcome.state === 'failed')
            setDrafts((items) =>
              items.map((q) =>
                q.id === outcome.id && q.numberOrigin === 'order' ? { ...q, number: 0 } : q,
              ),
            );
          if (outcome.state !== 'failed') completed.current.add(outcome.id);
        },
        onProgress: (value) =>
          setProgress(
            value.waiting
              ? 'Đang chờ hạn mức AI; sẽ tự tiếp tục sau một phút…'
              : `AI đang quét ${value.processed} / ${value.total} câu còn lại…`,
          ),
      });
      setProgress(
        result?.stopped
          ? 'AI chưa quét xong do lỗi kết nối hoặc cấu hình. Các kết quả đã nhận được giữ nguyên.'
          : 'Đã quét hết các câu. Câu phù hợp được tự gắn chuyên đề; bạn có thể duyệt cả đợt hoặc sửa các câu cần kiểm tra.',
      );
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
      else
        setProgress('Đã dừng quét. Kết quả đã nhận được giữ nguyên; có thể tiếp tục phần còn lại.');
    } finally {
      scanController.current = null;
      setBusy(false);
    }
  }
  async function apply() {
    setError('');
    const invalid = drafts.findIndex(
      (q) =>
        !q.statementRaw.trim() ||
        q.number < 1 ||
        q.number > 7 ||
        (q.topicIds?.length || 0) > 10 ||
        (mode !== 'classify' &&
          q.sourceType === 'tex' &&
          [...inspectTex(q.statementRaw), ...inspectTex(q.solutionRaw)].some(
            (i) => i.severity === 'error',
          )),
    );
    if (invalid >= 0) {
      setIndex(invalid);
      setSource(true);
      setError(
        'Cần sửa lỗi cú pháp, chọn dạng Câu 1–7 và tối đa 10 chuyên đề cho bài này trước khi áp dụng.',
      );
      return;
    }
    setBusy(true);
    try {
      await onApply(drafts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="preview-dialog question-review-dialog"
      aria-labelledby="review-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="preview-heading">
        <h2 id="review-title">
          {mode === 'classify' ? 'Duyệt phân loại AI' : 'Chuẩn hóa & kiểm tra'}
        </h2>
        <button className="icon-button" aria-label="Đóng bản duyệt" disabled={busy} onClick={close}>
          ×
        </button>
      </div>
      <div className="preview-body review-body">
        <div className="review-navigation">
          <button
            className="btn btn-quiet"
            disabled={busy || index === 0}
            onClick={() => setIndex((i) => i - 1)}
          >
            Bài trước
          </button>
          <span>
            Bài {index + 1} / {drafts.length}
          </span>
          <button
            className="btn btn-quiet"
            disabled={busy || index + 1 >= drafts.length}
            onClick={() => setIndex((i) => i + 1)}
          >
            Bài sau
          </button>
        </div>
        <p className="field-help">
          Nguồn gốc được giữ nguyên. Kiểm tra tự động chỉ xét cú pháp và quy tắc định dạng; chưa xác
          minh tính đúng sai của bài toán hay biên dịch toàn bộ tài liệu.
        </p>
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        {progress && (
          <p className="notice notice-success" role="status">
            {progress}
          </p>
        )}
        {!!Object.keys(outcomes).length && (
          <section className="scan-summary" aria-label="Tổng hợp phân loại">
            <p>
              Đã quét{' '}
              <strong>
                {Object.keys(outcomes).length} / {drafts.length}
              </strong>{' '}
              câu · Cần kiểm tra{' '}
              <strong>
                {Object.values(outcomes).filter((o) => o.state !== 'assigned').length}
              </strong>
            </p>
            <div className="scan-counts">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  className="soft-badge"
                  disabled={busy || !drafts.some((q) => q.number === n)}
                  onClick={() => setIndex(drafts.findIndex((q) => q.number === n))}
                >
                  Câu {n}: {drafts.filter((q) => q.number === n).length}
                </button>
              ))}
            </div>
            <details>
              <summary>Câu cần kiểm tra</summary>
              <ul>
                {Object.values(outcomes)
                  .filter((o) => o.state !== 'assigned')
                  .map((o) => (
                    <li key={o.id}>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => setIndex(drafts.findIndex((q) => q.id === o.id))}
                      >
                        {o.label}
                      </button>{' '}
                      — {o.reason}
                    </li>
                  ))}
              </ul>
            </details>
          </section>
        )}
        <div className="review-actions">
          <button
            className="btn btn-secondary"
            disabled={busy || !topics.length || completed.current.size === drafts.length}
            onClick={() => void classify()}
          >
            {completed.current.size === drafts.length
              ? 'AI đã quét hết bản nhập'
              : Object.keys(outcomes).length
                ? 'Tiếp tục quét câu chưa xử lý được'
                : 'AI quét toàn bộ bản nhập'}
          </button>
          {busy && scanController.current && (
            <button className="btn btn-quiet" onClick={() => scanController.current?.abort()}>
              Dừng quét AI
            </button>
          )}
          {mode !== 'classify' && (
            <button
              className="btn btn-quiet"
              disabled={busy}
              onClick={() => {
                const next = normalizeQuestion(current);
                update(next.question);
                setChanges((old) => ({ ...old, [current.id]: next.report }));
              }}
            >
              Chuẩn hóa lại bài này
            </button>
          )}
        </div>
        {reasons[current.id] && (
          <p className="ai-reason">
            <strong>AI gợi ý:</strong> {reasons[current.id]}
          </p>
        )}
        <div className="admin-form-grid">
          <label className="field">
            <span>Dạng câu của bài đang duyệt</span>
            <select
              aria-label="Dạng câu của bài đang duyệt"
              disabled={busy}
              value={current.number >= 1 && current.number <= 7 ? current.number : 0}
              onChange={(e) => update({ number: Number(e.target.value), numberOrigin: 'manual' })}
            >
              <option value={0}>Chọn dạng câu</option>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  Câu {n}
                </option>
              ))}
            </select>
          </label>
          <TopicPicker
            label="Chuyên đề của bài đang duyệt"
            topics={topics}
            value={current.topicIds || []}
            disabled={busy}
            onChange={(topicIds) => update({ topicIds })}
          />
        </div>
        {report && (
          <details className="review-report" open>
            <summary>Thay đổi chuẩn hóa ({report.changes.length})</summary>
            {report.changes.length ? (
              <ul>
                {report.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            ) : (
              <p>Chưa có thay đổi cú pháp tự động.</p>
            )}
            {!!report.points.length && <p>Điểm số trong nguồn: {report.points.join(', ')}</p>}
            {!!report.codes.length && <p>Mã trong nguồn: {report.codes.join(', ')}</p>}
          </details>
        )}
        {mode !== 'classify' && (
          <section className="review-issues" aria-label="Kết quả kiểm tra">
            {issues.length ? (
              <ul>
                {issues.map((issue, i) => (
                  <li
                    key={i}
                    className={issue.severity === 'error' ? 'review-error' : 'review-warning'}
                  >
                    {issue.severity === 'error' ? 'Lỗi' : 'Cần kiểm tra'} · dòng {issue.line}:{' '}
                    {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Không phát hiện lỗi ngoặc, môi trường hoặc dấu đóng công thức.</p>
            )}
            {!current.solutionRaw.trim() && <p>Cần kiểm tra: bài này chưa có lời giải.</p>}
          </section>
        )}
        <details className="review-original">
          <summary>Nguồn gốc để đối chiếu</summary>
          <textarea
            aria-label="Nguồn gốc"
            readOnly
            rows={8}
            value={current.raw || `${current.statementRaw}\n${current.solutionRaw}`}
          />
          {mode !== 'classify' && current.raw && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                try {
                  update(restoreQuestionSource(current));
                  setChanges((old) => ({
                    ...old,
                    [current.id]: {
                      ...(old[current.id] || { points: [], codes: [], issues: [] }),
                      changes: [],
                    },
                  }));
                  setError('');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Dùng lại nội dung gốc
            </button>
          )}
        </details>
        {mode !== 'classify' && (
          <button
            className="text-button"
            disabled={busy}
            aria-pressed={source}
            onClick={() => setSource((v) => !v)}
          >
            {source ? 'Xem trước bản đang dùng' : 'Sửa nguồn đang dùng'}
          </button>
        )}
        {source && mode !== 'classify' ? (
          <div className="review-source-fields">
            <label className="field">
              <span>Đề bài đang dùng</span>
              <textarea
                aria-label="Đề bài đang dùng"
                disabled={busy}
                rows={8}
                value={current.statementRaw}
                maxLength={1_000_000}
                onChange={(e) => update({ statementRaw: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Lời giải đang dùng</span>
              <textarea
                aria-label="Lời giải đang dùng"
                disabled={busy}
                rows={8}
                value={current.solutionRaw}
                maxLength={1_000_000}
                onChange={(e) => update({ solutionRaw: e.target.value })}
              />
            </label>
          </div>
        ) : (
          <Suspense fallback={<p role="status">Đang mở bản xem trước…</p>}>
            <section className="editor-preview">
              <h3>{current.label} · Đề bài</h3>
              <LatexContent
                key={`${current.id}-statement`}
                html={current.statementRaw}
                preamble={current.latexPreamble}
              />
              <h3>Lời giải</h3>
              <LatexContent
                key={`${current.id}-solution`}
                html={current.solutionRaw}
                preamble={current.latexPreamble}
                context={current.statementRaw}
              />
            </section>
          </Suspense>
        )}
      </div>
      <div className="preview-footer">
        <button className="btn btn-secondary" disabled={busy} onClick={close}>
          Đóng
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={() => void apply()}>
          {busy
            ? 'Đang xử lý…'
            : mode === 'import'
              ? 'Duyệt và dùng bản này'
              : 'Áp dụng các bài đã duyệt'}
        </button>
      </div>
    </dialog>
  );
}
