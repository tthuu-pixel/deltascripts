import { canProcessEssay, normalizeEssayQuestion } from '../../../shared/essayNormalization';
import { aiExerciseOnlyMessage } from '../../../shared/questionEnvironment';
import { runAutoImport, type AutoImportOutcome } from '../../services/autoImport';
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
const emptyFileErrors: string[] = [];
const emptyReports: Record<string, NormalizationReport> = {};
export type ReviewMode = 'import' | 'normalize' | 'classify';
export default function QuestionReview({
  questions,
  topics,
  reports = emptyReports,
  mode,
  autoClassify = false,
  autoStart = false,
  fileErrors = emptyFileErrors,
  importOptions,
  onAutoSaved,
  onAutoSkipped,
  onAutoQuestion,
  onClose,
  onApply,
}: {
  questions: Question[];
  topics: TopicSummary[];
  reports?: Record<string, NormalizationReport>;
  mode: ReviewMode;
  autoClassify?: boolean;
  autoStart?: boolean;
  fileErrors?: string[];
  importOptions?: { topicIds: string[]; published: boolean };
  onAutoSaved?: (questions: Question[]) => void;
  onAutoSkipped?: (ids: string[]) => void;
  onAutoQuestion?: (question: Question) => void;
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
  const [busy, setBusy] = useState(autoClassify || autoStart);
  const running = useRef(false);
  const savedIds = useRef(new Set<string>());
  const resolvedIds = useRef(new Set<string>());
  const [autoResults, setAutoResults] = useState<Record<string, AutoImportOutcome>>({});
  const [autoShown, setAutoShown] = useState(autoStart);
  const [autoPublished, setAutoPublished] = useState(importOptions?.published || false);
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
    if (!autoClassify && !autoStart) return;
    const timer = setTimeout(() => void (autoStart ? automaticImport() : classify(true)), 0);
    return () => {
      clearTimeout(timer);
      scanController.current?.abort();
    };
  }, [autoClassify, autoStart]);
  useEffect(() => {
    dialog.current?.querySelector('.review-body')?.scrollTo({ top: 0 });
  }, [index, error]);
  const current = drafts[index];
  const alreadySaved = savedIds.current.has(current.id);
  const savedCount = savedIds.current.size;
  const autoExceptions = Object.values(autoResults).filter(
    (result) => result.state === 'needs-review',
  );
  const autoSkipped = Object.values(autoResults).filter((result) => result.state === 'skipped');
  const autoComplete = savedCount + autoSkipped.length === drafts.length;
  const autoRetry = Object.values(autoResults).filter((result) => result.state === 'failed');
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
    if (savedIds.current.has(current.id)) return;
    setDrafts((items) => items.map((q) => (q.id === current.id ? { ...q, ...patch } : q)));
    if (patch.topicIds !== undefined) {
      const next = { ...current, ...patch };
      setOutcomes((old) =>
        old[current.id]
          ? {
              ...old,
              [current.id]: {
                ...old[current.id],
                state: !!next.topicIds?.length ? 'assigned' : 'unassigned',
                reason: 'Đã điều chỉnh thủ công trong bản duyệt.',
              },
            }
          : old,
      );
    }
  }
  function close() {
    if (
      !busy &&
      (savedIds.current.size +
        Object.values(autoResults).filter((result) => result.state === 'skipped').length ===
        drafts.length ||
        confirm('Đóng bản duyệt? Các chỉnh sửa trong cửa sổ này chưa được áp dụng.'))
    )
      onClose();
  }
  async function classify(automatic = false) {
    if (running.current) return;
    running.current = true;
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
          const next = applySuggestion(question, suggestion);
          if (next.topicIds?.length) resolvedIds.current.add(question.id);
          setReasons((old) => ({ ...old, [question.id]: suggestion.reason }));
          setDrafts((items) =>
            items.map((q) => (q.id === question.id ? applySuggestion(q, suggestion) : q)),
          );
        },
        onOutcome: (outcome) => {
          setOutcomes((old) => ({ ...old, [outcome.id]: outcome }));
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
      running.current = false;
      setBusy(false);
    }
  }
  async function automaticImport() {
    if (running.current || !onAutoSaved) return;
    running.current = true;
    const controller = new AbortController();
    scanController.current = controller;
    setBusy(true);
    setAutoShown(true);
    setError('');
    setProgress('Đang chuẩn bị nhận dạng, chuẩn hóa và thêm câu hỏi…');
    try {
      const [settings, freshTopics] = await Promise.all([
        apiService.getAiSettings(),
        apiService.getTopics(),
      ]);
      if (controller.signal.aborted) return;
      if (!settings.hasKey)
        throw new Error('Hãy lưu API key và mô hình trong Cấu hình AI trước khi nhập tự động.');
      if (!freshTopics.length) throw new Error('Hãy tạo chuyên đề trước khi nhập tự động.');
      const result = await runAutoImport(
        drafts.filter((q) => !savedIds.current.has(q.id)),
        {
          topics: freshTopics,
          signal: controller.signal,
          topicIds: importOptions?.topicIds,
          published: autoPublished,
          resolvedIds: resolvedIds.current,
          onQuestion: (q) => {
            setDrafts((items) => items.map((item) => (item.id === q.id ? q : item)));
            if (q.aiRepaired && q.topicIds?.length) resolvedIds.current.add(q.id);
            onAutoQuestion?.(q);
          },
          onSaved: (items) => {
            items.forEach((q) => savedIds.current.add(q.id));
            onAutoSaved(items);
          },
          onOutcome: (outcome) => {
            setAutoResults((old) => ({ ...old, [outcome.id]: outcome }));
            if (outcome.state === 'skipped') onAutoSkipped?.([outcome.id]);
          },
          onProgress: (value) =>
            setProgress(
              value.waiting
                ? 'Đang chờ hạn mức AI; sẽ tự tiếp tục…'
                : `AI tự xử lý ${value.processed} / ${value.total} câu · Đã thêm ${value.saved} · Chờ xử lý lại ${value.needsReview} · Chờ thử lại ${value.failed}`,
            ),
        },
      );
      setProgress(
        result.stopped
          ? 'Đã dừng. Các câu đã thêm được giữ nguyên; có thể tiếp tục phần còn lại.'
          : 'Đã xử lý hết lượt này. Các câu hoàn tất đã được lưu; câu chưa hoàn tất có thể để AI thử lại.',
      );
      if (result.stopped && !controller.signal.aborted) {
        setError(
          result.results.find((item) => item.state === 'failed')?.reason ||
            'AI chưa xử lý xong. Kiểm tra cấu hình hoặc kết nối rồi tiếp tục.',
        );
      }
      const first = drafts.findIndex((q) => !savedIds.current.has(q.id));
      if (first >= 0) {
        setIndex(first);
        setSource(true);
      }
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (controller.signal.aborted)
        setProgress('Đã dừng. Các câu đã thêm được giữ nguyên; có thể tiếp tục phần còn lại.');
      scanController.current = null;
      running.current = false;
      setBusy(false);
    }
  }
  async function apply() {
    setError('');
    const remaining = drafts.filter((q) => !savedIds.current.has(q.id));
    if (!remaining.length) {
      onClose();
      return;
    }
    const invalid = drafts.findIndex(
      (q) =>
        !savedIds.current.has(q.id) &&
        (!q.statementRaw.trim() ||
          (q.topicIds?.length || 0) > 10 ||
          (mode !== 'classify' &&
            q.sourceType === 'tex' &&
            [...inspectTex(q.statementRaw), ...inspectTex(q.solutionRaw)].some(
              (i) => i.severity === 'error',
            ))),
    );
    if (invalid >= 0) {
      setIndex(invalid);
      setSource(true);
      setError('Cần sửa lỗi cú pháp và chọn tối đa 10 chuyên đề cho bài này trước khi áp dụng.');
      return;
    }
    setBusy(true);
    try {
      await onApply(remaining.map((q) => (canProcessEssay(q) ? normalizeEssayQuestion(q) : q)));
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
          {autoShown
            ? 'Các câu đã thêm được giữ trong kho. Bạn chỉ cần xử lý các câu còn lại bên dưới.'
            : 'Nguồn gốc được giữ nguyên. Kiểm tra tự động chỉ xét cú pháp và quy tắc định dạng; chưa xác minh tính đúng sai của bài toán hay biên dịch toàn bộ tài liệu.'}
        </p>
        <p className="field-help">{aiExerciseOnlyMessage}</p>
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        {!!fileErrors.length && (
          <section
            className="notice notice-error import-file-errors"
            aria-label="Tệp cần xử lý riêng"
          >
            <h3>Tệp cần xử lý riêng</h3>
            <ul>
              {fileErrors.map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
            <p>Các tệp đọc được vẫn tiếp tục được xử lý.</p>
          </section>
        )}
        {progress && (
          <p className="notice notice-success" role="status">
            {progress}
          </p>
        )}
        {autoShown && (
          <section className="scan-summary auto-import-summary" aria-label="Kết quả AI tự động">
            <p>
              Đã thêm{' '}
              <strong>
                {savedCount} / {drafts.length}
              </strong>{' '}
              câu
              {!!(autoExceptions.length + autoRetry.length) && (
                <>
                  {' '}
                  · Chờ xử lý lại <strong>{autoExceptions.length + autoRetry.length}</strong>
                </>
              )}
            </p>
            {!!autoSkipped.length && (
              <p>
                Bỏ qua <strong>{autoSkipped.length}</strong> câu không thuộc phạm vi tự luận; không
                gửi AI hoặc tự thêm vào kho.
              </p>
            )}
            {savedCount === drafts.length && (
              <p>Tất cả câu đọc được đã được thêm vào ngân hàng và gắn chuyên đề.</p>
            )}
            {!autoShown && !!autoRetry.length && (
              <details open>
                <summary>Câu chờ thử lại</summary>
                <p>
                  Kiểm tra kết nối hoặc Cấu hình AI, sau đó bấm lại nút AI để tiếp tục các câu chưa
                  thêm.
                </p>
                <ul>
                  {autoRetry.map((result) => (
                    <li key={result.id}>
                      {result.label} — {result.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {!autoShown && !!autoExceptions.length && (
              <details open>
                <summary>Các câu cần làm riêng</summary>
                <ul>
                  {autoExceptions.map((result) => (
                    <li key={result.id}>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => {
                          setIndex(drafts.findIndex((q) => q.id === result.id));
                          setSource(true);
                        }}
                      >
                        {result.label}
                      </button>{' '}
                      — {result.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}
        {mode === 'import' && onAutoSaved && (
          <section className="auto-import-options surface" aria-label="Nhập bằng AI">
            <h3>Để AI xử lý toàn bộ</h3>
            <p>
              AI xử lý bt và chuyển ex tự luận sang bt, bỏ immini, giữ nguyên TikZ, chuẩn hóa và
              phân theo mô tả ngắn của chuyên đề đã có và thêm vào kho. AI tự sửa mã và lời giải,
              chọn chuyên đề và lưu các câu hoàn tất.
            </p>
            <label className="publish-controls">
              <input
                type="checkbox"
                disabled={busy || savedCount === drafts.length}
                checked={autoPublished}
                onChange={(e) => setAutoPublished(e.target.checked)}
              />
              Xuất bản các câu xử lý được
            </label>
            <p className="field-help">
              Bỏ chọn để lưu nháp. Bản trước khi sửa được lưu lại. AI kiểm tra và sửa lời giải có
              sẵn, giữ trống nếu nguồn chưa có lời giải.
            </p>
          </section>
        )}
        {!autoShown && !!Object.keys(outcomes).length && (
          <section className="scan-summary" aria-label="Tổng hợp phân loại">
            <p>
              Đã quét{' '}
              <strong>
                {Object.keys(outcomes).length} / {drafts.length}
              </strong>{' '}
              câu · Chờ xử lý lại{' '}
              <strong>
                {
                  Object.values(outcomes).filter(
                    (o) => o.state !== 'assigned' && o.state !== 'skipped',
                  ).length
                }
              </strong>
            </p>
            {Object.values(outcomes).some((o) => o.state === 'skipped') && (
              <p>
                Bỏ qua {Object.values(outcomes).filter((o) => o.state === 'skipped').length} câu
                không thuộc phạm vi tự luận.
              </p>
            )}
            <details>
              <summary>Chi tiết các câu chờ xử lý lại</summary>
              <ul>
                {Object.values(outcomes)
                  .filter((o) => o.state !== 'assigned' && o.state !== 'skipped')
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
            disabled={
              busy || savedCount > 0 || !topics.length || completed.current.size === drafts.length
            }
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
              disabled={busy || alreadySaved}
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
        {alreadySaved && (
          <p className="notice notice-success">
            Câu này đã được thêm vào kho. Có thể chỉnh sửa sau trong ngân hàng câu hỏi.
          </p>
        )}
        {reasons[current.id] && (
          <p className="ai-reason">
            <strong>AI gợi ý:</strong> {reasons[current.id]}
          </p>
        )}
        <div className="admin-form-grid">
          <TopicPicker
            label="Chuyên đề của bài đang duyệt"
            topics={topics}
            value={current.topicIds || []}
            disabled={busy || alreadySaved}
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
        {mode !== 'classify' && !autoShown && !autoClassify && (
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
            value={
              current.originalRaw ||
              current.raw ||
              `${current.statementRaw}\n${current.solutionRaw}`
            }
          />
          {mode !== 'classify' && (current.originalRaw || current.raw) && (
            <button
              className="text-button"
              disabled={busy || alreadySaved}
              onClick={() => {
                try {
                  update(
                    restoreQuestionSource({ ...current, raw: current.originalRaw || current.raw }),
                  );
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
            disabled={busy || alreadySaved}
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
                disabled={busy || alreadySaved}
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
                disabled={busy || alreadySaved}
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
        {mode === 'import' && onAutoSaved && !autoComplete && (
          <button
            className="btn btn-primary"
            disabled={busy}
            aria-label="AI xử lý và thêm tất cả"
            onClick={() => void automaticImport()}
          >
            AI xử lý và thêm tất cả
          </button>
        )}
        <button
          className={
            mode === 'import' && savedCount < drafts.length
              ? 'btn btn-secondary'
              : 'btn btn-primary'
          }
          disabled={busy}
          onClick={() => (autoComplete ? onClose() : void apply())}
        >
          {autoComplete
            ? 'Hoàn tất'
            : busy
              ? 'Đang xử lý…'
              : mode === 'import'
                ? 'Duyệt và dùng bản này'
                : 'Áp dụng các bài đã duyệt'}
        </button>
      </div>
    </dialog>
  );
}
