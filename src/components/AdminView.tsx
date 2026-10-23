import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { apiService, clearApiCache } from '../services/apiService';
import type { AccessCode, Question } from '../types';
import Icon from './Icons';
import Brand from './Brand';
import MathScene from './MathScene';
import type { TopicSummary } from '../../shared/content';
import TopicPicker from './admin/TopicPicker';
import BulkQuestionActions from './admin/BulkQuestionActions';
import type { NormalizationReport } from '../../shared/importReview';
import type { ReviewMode } from './admin/QuestionReview';
const ExamSettingsManager = lazy(() => import('./admin/ExamSettingsManager'));
const AiSettingsManager = lazy(() => import('./admin/AiSettingsManager'));
const AiBankScan = lazy(() => import('./admin/AiBankScan'));
const QuestionReview = lazy(() => import('./admin/QuestionReview'));
const TopicManager = lazy(() => import('./admin/TopicManager'));
const StudentSettingsManager = lazy(() => import('./admin/StudentSettingsManager'));
const QuestionEditor = lazy(() => import('./admin/QuestionEditor'));
const LatexContent = lazy(() => import('./LatexContent'));
const button = 'btn btn-secondary';

export default function AdminView() {
  const [tab, setTab] = useState<
    'topics' | 'questions' | 'student' | 'codes' | 'info' | 'ai' | 'exam'
  >('questions');
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [topicFilter, setTopicFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState(''),
    [searchDraft, setSearchDraft] = useState('');
  const [importTopicIds, setImportTopicIds] = useState<string[]>([]);
  const [importPublished, setImportPublished] = useState(false);
  const [contentDirty, setContentDirty] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [pending, setPending] = useState<Question[]>([]);
  const [importReports, setImportReports] = useState<Record<string, NormalizationReport>>({});
  const [importReviewed, setImportReviewed] = useState(false);
  const [bankScanning, setBankScanning] = useState(false);
  const [review, setReview] = useState<{
    mode: ReviewMode;
    questions: Question[];
    reports?: Record<string, NormalizationReport>;
    autoClassify?: boolean;
    autoStart?: boolean;
    fileErrors?: string[];
  } | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0),
    [newCode, setNewCode] = useState('');
  const [preview, setPreview] = useState<{ question: Question; solution: boolean } | null>(null);
  const worker = useRef<Worker | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const automaticFile = useRef(false);
  const automaticSaved = useRef(0);
  const [importFileErrors, setImportFileErrors] = useState<string[]>([]);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const previewOpen = !!preview;
  useEffect(() => {
    const dialog = previewDialog.current;
    if (previewOpen) dialog?.showModal();
    return () => dialog?.close();
  }, [previewOpen]);
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => {
    let active = true;
    setSelectedCodes([]);
    setError('');
    if (tab !== 'questions' && tab !== 'codes') {
      setBusy(false);
      return;
    }
    setBusy(true);
    (tab === 'questions'
      ? apiService
          .getQuestions(page, { topicId: topicFilter, status: statusFilter, search })
          .then((data) => {
            if (active) {
              setQuestions(data.items);
              setTotal(data.total);
            }
          })
      : apiService.getAccessCodes().then((items) => {
          if (active) setCodes(items);
        })
    )
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [tab, page, topicFilter, statusFilter, search, refresh]);
  useEffect(() => {
    if (tab !== 'questions') return;
    let active = true;
    apiService
      .getTopics()
      .then((items) => {
        if (active) setTopics(items);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [tab, refresh]);
  useEffect(() => {
    setSelection([]);
  }, [tab, topicFilter, statusFilter, search]);
  function reload() {
    setSelection([]);
    clearApiCache();
    setRefresh((v) => v + 1);
  }
  async function selectAll() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const ids = await apiService.getQuestionSelection({
        topicId: topicFilter,
        status: statusFilter,
        search,
      });
      setSelection(ids);
      setNotice(`Đã chọn ${ids.length} câu theo bộ lọc trên tất cả các trang.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reviewSelected(mode: ReviewMode) {
    setBusy(true);
    setError('');
    try {
      const items = await apiService.getSelectedQuestions(selection);
      setReview({ mode, autoClassify: mode === 'classify', questions: items });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function updateSelection(work: (ids: string[]) => Promise<unknown>) {
    for (let i = 0; i < selection.length; i += 100) {
      const batch = selection.slice(i, i + 100);
      try {
        await work(batch);
      } catch (e) {
        clearApiCache();
        setRefresh((v) => v + 1);
        throw e;
      }
      setSelection((current) => current.filter((id) => !batch.includes(id)));
    }
    setPage(1);
  }
  async function mutate(work: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      setNotice(message);
      reload();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function importFiles(files: File[]) {
    if (!files.length) return;
    automaticSaved.current = 0;
    const automatic = automaticFile.current;
    automaticFile.current = false;
    setBusy(true);
    setError('');
    setNotice('Đang đọc file…');
    worker.current?.terminate();
    const task = new Worker(new URL('../parsers/import.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.current = task;
    task.onmessage = (event) => {
      setBusy(false);
      if (event.data.error) {
        setError(event.data.error);
        setNotice('');
      } else {
        setPending(event.data.questions);
        setImportFileErrors(event.data.fileErrors || []);
        setImportReports(event.data.reports);
        setImportReviewed(false);
        setReview({
          mode: 'import',
          questions: event.data.questions,
          reports: event.data.reports,
          autoClassify: !automatic,
          autoStart: automatic,
          fileErrors: event.data.fileErrors || [],
        });
        setNotice(`Đã đọc ${event.data.questions.length} câu. Kiểm tra trước khi lưu.`);
      }
      task.terminate();
      worker.current = null;
    };
    task.onerror = () => {
      setError('Không đọc được file. Hãy kiểm tra định dạng.');
      setNotice('');
      setBusy(false);
      task.terminate();
    };
    task.postMessage(files);
  }
  async function save() {
    if (!importReviewed) return;
    await mutate(
      async () => {
        // Confirm each batch before removing it from the pending list. Retries reuse IDs.
        let remaining = pending.map((question) => ({
          ...question,
          topicIds: [...new Set([...importTopicIds, ...(question.topicIds || [])])],
          published: importPublished,
        }));
        while (remaining.length) {
          const batch: Question[] = [];
          let bytes = 0;
          for (const question of remaining.slice(0, 100)) {
            const size = new TextEncoder().encode(JSON.stringify(question)).length;
            if (size > 1_500_000)
              throw new Error('Một câu hỏi vượt 1,5 MB, hãy giảm kích thước ảnh hoặc nguồn.');
            if (bytes + size > 1_500_000) break;
            bytes += size;
            batch.push(question);
          }
          await apiService.saveQuestions(batch);
          remaining = remaining.slice(batch.length);
          setPending(remaining);
        }
        setPage(1);
      },
      importPublished
        ? 'Đã lưu và xuất bản các câu hỏi.'
        : 'Đã lưu nháp câu hỏi. Bạn có thể xuất bản trong kho.',
    );
  }
  async function createCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const generated = Array.from(
      crypto.getRandomValues(new Uint8Array(8)),
      (n) => alphabet[n % alphabet.length],
    ).join('');
    const code = newCode.trim().toUpperCase() || generated;
    await mutate(async () => {
      await apiService.createAccessCode(code);
      setNewCode('');
    }, `Đã tạo mã ${code}.`);
  }
  const toggle = (id: string) =>
    setSelection((items) => (items.includes(id) ? items.filter((x) => x !== id) : [...items, id]));
  return (
    <div className="teacher-page page-width">
      <section className="teacher-hero">
        <div>
          <span className="eyebrow">
            <span className="tiny-spark">✦</span> BẠN LÀ NGƯỜI BIÊN SOẠN
          </span>
          <h1>Trang quản trị</h1>
          <p>
            Quản lý nội dung theo cách của bạn.
            <br />
            Tự đưa bài học lên. Chủ động xuất bản cho học sinh.
          </p>
          <div className="hero-tags">
            <span>
              <i className="dot dot-blue" />
              Nguồn Word &amp; LaTeX
            </span>
            <span>
              <i className="dot dot-red" />
              Câu hỏi theo chuyên đề
            </span>
            <span>
              <i className="dot dot-yellow" />
              Mã ôn tập riêng
            </span>
          </div>
        </div>
        <div className="teacher-hero-art">
          <MathScene compact />
        </div>
      </section>
      <nav className="teacher-tabs" aria-label="Quản lý">
        {(
          [
            ['topics', 'Chuyên đề', 'topics'],
            ['questions', 'Ngân hàng câu hỏi', 'practice'],
            ['exam', 'Cấu hình tạo đề', 'exam'],
            ['student', 'Trang học sinh', 'school'],
            ['ai', 'Cấu hình AI', 'spark'],
            ['codes', 'Quản lý mã ôn tập', 'key'],
            ['info', 'Thông tin hệ thống', 'info'],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            aria-pressed={tab === key}
            disabled={busy}
            onClick={() => {
              if (contentDirty && !confirm('Bỏ các thay đổi chưa lưu?')) return;
              setTab(key);
              setError('');
              setNotice('');
            }}
          >
            <Icon name={icon} size={23} />
            {label}
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="notice notice-error">
          <Icon name="info" size={20} />
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice notice-success">
          <Icon name="check" size={20} />
          {notice}
        </p>
      )}
      <Suspense
        fallback={
          <p role="status" className="loading-state">
            Đang mở quản trị…
          </p>
        }
      >
        {tab === 'topics' && (
          <TopicManager
            onDirtyChange={setContentDirty}
            onQuestions={(id) => {
              setTopicFilter(id);
              setImportTopicIds([id]);
              setPage(1);
              setTab('questions');
            }}
          />
        )}
        {tab === 'exam' && <ExamSettingsManager onDirtyChange={setContentDirty} />}
        {tab === 'student' && <StudentSettingsManager onDirtyChange={setContentDirty} />}
        {tab === 'ai' && <AiSettingsManager onDirtyChange={setContentDirty} />}
        {bankScanning && <AiBankScan onClose={() => setBankScanning(false)} onChanged={reload} />}
        {review && (
          <QuestionReview
            key={review.questions.map((q) => q.id).join(',') + review.mode}
            {...review}
            topics={topics}
            importOptions={{
              topicIds: importTopicIds,
              published: importPublished,
            }}
            onAutoQuestion={(q) =>
              setPending((items) => items.map((item) => (item.id === q.id ? q : item)))
            }
            onAutoSkipped={(ids) => {
              setPending((items) => items.filter((item) => !ids.includes(item.id)));
            }}
            onAutoSaved={(items) => {
              const ids = new Set(items.map((q) => q.id));
              setPending((old) => old.filter((q) => !ids.has(q.id)));
              setImportReviewed(false);
              automaticSaved.current += items.length;
              setNotice(
                `AI đã thêm ${automaticSaved.current} câu vào kho và gắn chuyên đề. Các câu cần làm riêng còn trong bản nhập.`,
              );
              reload();
            }}
            onClose={() => setReview(null)}
            onApply={async (items) => {
              if (review.mode === 'import') {
                setPending(items);
                setImportReviewed(true);
                setNotice('Đã duyệt bản nhập. Chọn trạng thái rồi lưu lên hệ thống.');
              } else if (review.mode === 'classify') {
                for (const q of items)
                  await apiService.classifyQuestions([q.id], {
                    topicIds: q.topicIds || [],
                    mode: 'replace',
                  });
                setNotice('Đã áp dụng phân loại đã duyệt.');
                reload();
              } else {
                for (const q of items) await apiService.saveQuestions([q]);
                setNotice('Đã lưu bản chuẩn hóa và giữ nguồn gốc để đối chiếu.');
                reload();
              }
              setReview(null);
            }}
          />
        )}
        {editingQuestion && (
          <QuestionEditor
            question={editingQuestion}
            topics={topics}
            onDirtyChange={setContentDirty}
            onClose={() => setEditingQuestion(null)}
            onSaved={() => {
              reload();
              setNotice('Đã lưu thay đổi câu hỏi.');
            }}
          />
        )}
      </Suspense>
      {tab === 'questions' && (
        <div className="bank-layout">
          <aside className="bank-sidebar">
            <section className="surface import-panel">
              <span className="section-kicker">THÊM MỘT NGUỒN TRI THỨC</span>
              <h2>Thêm câu hỏi mới</h2>
              <div
                className="import-dropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!busy) {
                    automaticFile.current = false;
                    importFiles(Array.from(event.dataTransfer.files));
                  }
                }}
              >
                <span className="icon-tile tone-blue">
                  <Icon name="upload" size={33} />
                </span>
                <h3>Đưa bài học lên đây</h3>
                <p>
                  Kéo thả file Word hoặc LaTeX.
                  <br />
                  Mỗi file tối đa 20 MB.
                </p>
                <input
                  ref={fileInput}
                  aria-label="Chọn file câu hỏi"
                  className="visually-hidden"
                  type="file"
                  accept=".docx,.tex"
                  multiple
                  disabled={busy}
                  onChange={(event) => {
                    importFiles(Array.from(event.target.files || []));
                    event.target.value = '';
                  }}
                />
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => {
                    automaticFile.current = false;
                    fileInput.current?.click();
                  }}
                >
                  <Icon name="upload" size={18} />
                  Chọn file câu hỏi
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    automaticFile.current = true;
                    fileInput.current?.click();
                  }}
                >
                  <Icon name="spark" size={18} />
                  AI nhập tự động
                </button>
                <span className="file-types">
                  .TEX
                  <span />
                  .DOCX
                </span>
              </div>
              <div className="import-instructions">
                <span>01</span>
                <p>AI chỉ phân loại bài tự luận trong môi trường bt; bỏ qua ex.</p>
                <span>02</span>
                <p>
                  Dùng <strong>AI nhập tự động</strong> để thêm thẳng vào kho; chỉ xử lý riêng các
                  câu còn lỗi.
                </p>
              </div>
              {!!importFileErrors.length && (
                <div className="notice notice-error import-file-errors" role="alert">
                  <strong>Tệp cần xử lý riêng</strong>
                  <ul>
                    {importFileErrors.map((message, i) => (
                      <li key={i}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {pending.length > 0 && (
                <div className="pending-import">
                  <h3>
                    <Icon name="check" size={18} />
                    {pending.length} câu chờ lưu
                  </h3>
                  <TopicPicker
                    topics={topics}
                    value={importTopicIds}
                    onChange={setImportTopicIds}
                    disabled={busy}
                    label="Chuyên đề cho bản nhập"
                  />
                  <label className="publish-controls">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={importPublished}
                      onChange={(e) => setImportPublished(e.target.checked)}
                    />
                    Xuất bản ngay sau khi lưu
                  </label>
                  <p className="field-help">
                    Bỏ chọn để lưu nháp. Một câu có thể nằm trong nhiều chuyên đề.
                  </p>
                  <div className="pending-chips">
                    {pending.slice(0, 20).map((q) => (
                      <button
                        className="soft-badge"
                        key={q.id}
                        onClick={() => setPreview({ question: q, solution: false })}
                      >
                        {q.label}
                        <Icon name="eye" size={14} />
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      setReview({
                        mode: 'import',
                        questions: pending,
                        reports: importReports,
                        fileErrors: importFileErrors,
                      })
                    }
                  >
                    {importReviewed ? 'Xem lại bản đã duyệt' : 'Chuẩn hóa & kiểm tra bản nhập'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      setReview({
                        mode: 'import',
                        questions: pending,
                        reports: importReports,
                        autoStart: true,
                        fileErrors: importFileErrors,
                      })
                    }
                  >
                    AI xử lý và thêm tất cả
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy || !importReviewed}
                    onClick={save}
                  >
                    Lưu lên hệ thống
                    <Icon name="arrow" size={18} />
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm('Bỏ các câu chưa lưu?')) setPending([]);
                    }}
                  >
                    Bỏ bản nhập
                  </button>
                </div>
              )}
            </section>
          </aside>
          <section className="bank-main">
            <div className="section-heading">
              <div>
                <span className="section-kicker">CHUẨN BỊ CHO NHỮNG GIỜ HỌC HAY</span>
                <h2>Kho câu hỏi của bạn</h2>
                <p className="muted">
                  {busy
                    ? 'Đang cập nhật nguồn câu hỏi…'
                    : `${total} câu hỏi trong kho · Gồm bản nháp và bài đã xuất bản`}
                </p>
              </div>
              <button
                className="icon-button"
                disabled={busy}
                onClick={reload}
                aria-label="Làm mới"
                title="Làm mới"
              >
                <Icon name="refresh" size={21} />
              </button>
            </div>
            <div className="review-actions">
              <button
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setBankScanning(true)}
              >
                <Icon name="spark" size={19} /> AI quét và sắp xếp toàn bộ kho
              </button>
              <span className="field-help">
                Chỉ quét bài trong môi trường bt, dựa vào mô tả ngắn của chuyên đề.
              </span>
            </div>
            <div className="bank-toolbar">
              <label>
                Chuyên đề
                <select
                  aria-label="Lọc chuyên đề"
                  disabled={busy}
                  value={topicFilter}
                  onChange={(e) => {
                    setTopicFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tất cả chuyên đề</option>
                  <option value="unassigned">Chưa gắn chuyên đề</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Trạng thái
                <select
                  aria-label="Lọc trạng thái"
                  disabled={busy}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                </select>
              </label>
              <button
                className="text-button"
                disabled={busy || !questions.length}
                onClick={() =>
                  setSelection((current) =>
                    questions.every((q) => current.includes(q.id))
                      ? current.filter((id) => !questions.some((q) => q.id === id))
                      : [...new Set([...current, ...questions.map((q) => q.id)])],
                  )
                }
              >
                Chọn/bỏ chọn trang này
              </button>
              <button
                className="btn btn-secondary"
                disabled={busy || !total}
                onClick={() => void selectAll()}
              >
                Chọn hết
              </button>
              <button
                className="text-button"
                disabled={busy || !selection.length}
                onClick={() => setSelection([])}
              >
                Bỏ chọn
              </button>
            </div>
            <p className="field-help">
              “Chọn hết” áp dụng cho các câu theo bộ lọc trên tất cả các trang.
            </p>
            <form
              className="bank-search"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchDraft.trim());
                setPage(1);
              }}
            >
              <label className="search-field">
                <Icon name="search" size={19} />
                <input
                  aria-label="Tìm câu hỏi"
                  placeholder="Tìm trong đề bài hoặc nhãn câu…"
                  maxLength={160}
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </label>
              <button className="btn btn-secondary" disabled={busy}>
                Tìm
              </button>
            </form>
            {selection.length > 0 && (
              <div className="review-actions">
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void reviewSelected('normalize')}
                >
                  Chuẩn hóa &amp; kiểm tra câu đã chọn
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void reviewSelected('classify')}
                >
                  AI phân loại câu đã chọn
                </button>
              </div>
            )}
            {selection.length > 0 && (
              <BulkQuestionActions
                count={selection.length}
                topics={topics}
                busy={busy}
                onApply={(changes) =>
                  void mutate(
                    () => updateSelection((ids) => apiService.classifyQuestions(ids, changes)),
                    'Đã cập nhật phân loại và trạng thái câu hỏi.',
                  )
                }
              />
            )}
            {selection.length > 0 && (
              <div className="selection-bar">
                <span>
                  Đã chọn <strong>{selection.length}</strong> câu hỏi
                </span>
                <button
                  className="btn btn-danger"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`Xóa ${selection.length} câu đã chọn?`))
                      void mutate(async () => {
                        await updateSelection((ids) => apiService.deleteQuestions(ids));
                      }, 'Đã xóa câu hỏi.');
                  }}
                >
                  <Icon name="trash" size={18} />
                  Xóa đã chọn ({selection.length})
                </button>
              </div>
            )}
            {busy && (
              <p role="status" className="loading-state">
                <span className="loading-dot" />
                Đang xử lý…
              </p>
            )}
            {!busy && !questions.length && !error && (
              <div className="surface empty-state bank-empty">
                <div className="empty-illustration">
                  <Icon name="guide" size={60} />
                  <i />
                  <i />
                </div>
                <h3>Một kho câu hỏi đang chờ được viết.</h3>
                <p>
                  Thêm file đầu tiên để bắt đầu.
                  <br />
                  Những bài học hay sẽ sớm có mặt ở đây.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    automaticFile.current = false;
                    fileInput.current?.click();
                  }}
                >
                  Nhập file đầu tiên
                  <Icon name="arrow" size={18} />
                </button>
              </div>
            )}
            <div className="bank-question-list">
              {questions.map((q) => (
                <article
                  key={q.id}
                  className={`bank-question-card surface ${selection.includes(q.id) ? 'selected' : ''}`}
                >
                  <label className="question-checkbox">
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${q.label}`}
                      disabled={busy}
                      checked={selection.includes(q.id)}
                      onChange={() => toggle(q.id)}
                    />
                  </label>
                  <div className="bank-question-content">
                    <div className="bank-question-title">
                      <h2>{q.label}</h2>
                      <span
                        className={`source-badge ${q.sourceType === 'tex' ? 'source-tex' : 'source-word'}`}
                      >
                        {q.sourceType === 'word' ? 'Word' : 'TeX'}
                      </span>
                      <span className={`publication-badge ${q.published ? 'is-published' : ''}`}>
                        {q.published ? 'Đã xuất bản' : 'Bản nháp'}
                      </span>
                    </div>
                    <div className="content-badges question-topic-labels">
                      {q.topicIds?.length ? (
                        q.topicIds.map((id) => (
                          <span key={id}>
                            {topics.find((t) => t.id === id)?.title || 'Chuyên đề'}
                          </span>
                        ))
                      ) : (
                        <span>Chưa gắn chuyên đề</span>
                      )}
                    </div>
                    <div className="bank-question-excerpt">
                      <Suspense fallback={<span>Đang mở tóm tắt đề bài…</span>}>
                        <LatexContent
                          html={q.statementRaw}
                          preamble={q.latexPreamble}
                          renderFigures={false}
                        />
                      </Suspense>
                    </div>
                    <div className="bank-question-actions">
                      <button className="text-button" onClick={() => setEditingQuestion(q)}>
                        <Icon name="practice" size={18} />
                        Chỉnh sửa
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setPreview({ question: q, solution: false })}
                      >
                        <Icon name="eye" size={18} />
                        Xem đề bài
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setPreview({ question: q, solution: true })}
                      >
                        <Icon name="guide" size={18} />
                        Xem lời giải
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="bank-pagination">
              <button
                className={button}
                disabled={busy || page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <Icon name="back" size={17} />
                Trang trước
              </button>
              <span>
                Trang <strong>{page}</strong> / {Math.max(1, Math.ceil(total / 20))}
                <small>{total} câu hỏi</small>
              </span>
              <button
                className={button}
                disabled={busy || page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </section>
        </div>
      )}
      {tab === 'codes' && (
        <section className="codes-workspace">
          <div className="section-heading">
            <div>
              <span className="section-kicker">MỞ CỬA CHO NHỮNG GIỜ TỰ HỌC</span>
              <h2>Mã ôn tập cho học sinh</h2>
              <p className="muted">
                Tạo mã và chia sẻ với lớp. Học sinh dùng mã để vào không gian học tập.
              </p>
            </div>
          </div>
          <div className="code-create-card surface">
            <span className="icon-tile tone-yellow">
              <Icon name="key" size={32} />
            </span>
            <div>
              <h3>Tạo một chiếc chìa khóa mới</h3>
              <p>Bỏ trống để tự tạo mã 8 ký tự, hoặc nhập mã bạn muốn dùng.</p>
            </div>
            <div className="code-create-controls">
              <input
                aria-label="Mã truy cập mới"
                maxLength={8}
                className="account-input code-input"
                placeholder="Mã 8 ký tự (tùy chọn)"
                value={newCode}
                onChange={(event) => setNewCode(event.target.value.toUpperCase())}
                disabled={busy}
              />
              <button className="btn btn-primary" disabled={busy} onClick={createCode}>
                Tạo mã mới
                <Icon name="arrow" size={18} />
              </button>
            </div>
          </div>
          <div className="codes-table-panel surface">
            <div className="codes-table-top">
              <h3>Danh sách mã</h3>
              <button
                className="btn btn-danger"
                disabled={busy || !selectedCodes.length}
                onClick={() => {
                  if (
                    confirm(
                      `Ngừng hoạt động ${selectedCodes.length} mã đã chọn? Học sinh dùng mã này sẽ được đăng xuất.`,
                    )
                  )
                    void mutate(
                      () => apiService.deleteAccessCodes(selectedCodes),
                      'Đã ngừng hoạt động các mã.',
                    );
                }}
              >
                <Icon name="lock" size={17} />
                Ngừng mã đã chọn
              </button>
            </div>
            {busy && (
              <p role="status" className="loading-state">
                <span className="loading-dot" />
                Đang xử lý…
              </p>
            )}
            <div className="codes-table-scroll">
              <table className="codes-table">
                <thead>
                  <tr>
                    <th scope="col">Chọn</th>
                    <th scope="col">Mã truy cập</th>
                    <th scope="col">Ngày tạo</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">
                      <span className="visually-hidden">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.code}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Chọn mã ${code.code}`}
                          disabled={busy || !code.active}
                          checked={selectedCodes.includes(code.code)}
                          onChange={() =>
                            setSelectedCodes((items) =>
                              items.includes(code.code)
                                ? items.filter((c) => c !== code.code)
                                : [...items, code.code],
                            )
                          }
                        />
                      </td>
                      <td>
                        <span className="access-code">{code.code}</span>
                      </td>
                      <td>{new Date(code.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span
                          className={`code-status ${code.active ? 'is-active' : 'is-inactive'}`}
                        >
                          <i />
                          {code.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="text-button"
                          aria-label={`Sao chép mã ${code.code}`}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(code.code);
                              setNotice(`Đã sao chép mã ${code.code}.`);
                            } catch {
                              setError(
                                'Chưa sao chép được. Bạn có thể chọn và sao chép mã trực tiếp.',
                              );
                            }
                          }}
                        >
                          Sao chép
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!busy && !codes.length && !error && (
              <div className="empty-state">
                <Icon name="key" size={45} />
                <h3>Chưa có mã ôn tập nào.</h3>
                <p>Tạo mã đầu tiên và mời học sinh cùng bắt đầu.</p>
              </div>
            )}
          </div>
        </section>
      )}
      {tab === 'info' && (
        <div className="teacher-about surface">
          <div>
            <Brand />
            <span className="section-kicker">DÀNH CHO NHỮNG NGƯỜI YÊU VIỆC HỌC</span>
            <h2>Học Toán, theo cách gần gũi hơn.</h2>
            <p>
              DeltaScript là không gian ôn tập Toán 9: học kiến thức nền tảng, luyện theo chuyên đề
              và thử sức với đề tham khảo.
            </p>
            <div className="teacher-contact">
              <span className="icon-tile tone-yellow">
                <Icon name="user" size={28} />
              </span>
              <div>
                <strong>Thầy Trương Trọng Hữu</strong>
                <p>Giáo viên Toán · Phát triển DeltaScript</p>
              </div>
            </div>
            <p>THCS Nguyễn Tri Phương · Phường Diên Hồng (Quận 10).</p>
            <a className="text-button" href="tel:0906773516">
              Liên hệ: 0906.773.516
              <Icon name="arrow" size={17} />
            </a>
          </div>
          <MathScene />
        </div>
      )}
      <footer className="study-footer">
        <span className="footer-wordmark">
          Delta<span>Script</span>
          <i>✦</i>
        </span>
        <span>Một câu hỏi hay có thể mở ra rất nhiều điều.</span>
      </footer>
      {preview && (
        <dialog
          ref={previewDialog}
          onCancel={() => setPreview(null)}
          className="preview-dialog"
          aria-labelledby="preview-title"
        >
          <section>
            <div className="preview-heading">
              <span className="icon-tile tone-blue">
                <Icon name={preview.solution ? 'guide' : 'practice'} size={25} />
              </span>
              <div>
                <span className="section-kicker">XEM TRƯỚC CÂU HỎI</span>
                <h2 id="preview-title">
                  {preview.question.label} – {preview.solution ? 'Lời giải' : 'Đề bài'}
                </h2>
              </div>
              <button className="icon-button" aria-label="Đóng" onClick={() => setPreview(null)}>
                <Icon name="close" size={22} />
              </button>
            </div>
            <div className="preview-body">
              <Suspense fallback={<p className="loading-state">Đang tải…</p>}>
                <LatexContent
                  preamble={preview.question.latexPreamble}
                  context={preview.solution ? preview.question.statementRaw : ''}
                  html={
                    preview.solution
                      ? preview.question.solutionRaw || 'Chưa có lời giải.'
                      : preview.question.statementRaw
                  }
                />
              </Suspense>
            </div>
            <div className="preview-footer">
              <button
                className={button}
                onClick={() => setPreview((v) => v && { ...v, solution: !v.solution })}
              >
                <Icon name="refresh" size={18} />
                Chuyển sang {preview.solution ? 'đề bài' : 'lời giải'}
              </button>
              <button className="btn btn-primary" onClick={() => setPreview(null)}>
                Xong
                <Icon name="check" size={18} />
              </button>
            </div>
          </section>
        </dialog>
      )}
    </div>
  );
}
