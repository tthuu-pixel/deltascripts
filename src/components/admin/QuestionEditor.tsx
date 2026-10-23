import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Question } from '../../types';
import type { TopicSummary } from '../../../shared/content';
import { apiService } from '../../services/apiService';
import Icon from '../Icons';
import TopicPicker from './TopicPicker';
import { useUnsavedChanges } from './useUnsavedChanges';
const LatexContent = lazy(() => import('../LatexContent'));
export default function QuestionEditor({
  question,
  topics,
  onClose,
  onSaved,
  onDirtyChange,
}: {
  question: Question;
  topics: TopicSummary[];
  onClose: () => void;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState({
      ...question,
      published: question.published !== false,
      topicIds: question.topicIds || [],
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(false),
    [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty, onDirtyChange);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  function close() {
    if (!busy && (!dirty || confirm('Bỏ thay đổi câu hỏi chưa lưu?'))) onClose();
  }
  function update(value: Partial<Question>) {
    setDraft((old) => ({ ...old, ...value }));
    setDirty(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiService.saveQuestions([draft]);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="preview-dialog question-editor-dialog"
      aria-labelledby="question-editor-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <form onSubmit={save}>
        <div className="preview-heading">
          <h2 id="question-editor-title">Chỉnh sửa câu hỏi</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="Đóng chỉnh sửa"
            disabled={busy}
            onClick={close}
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="preview-body content-editor">
          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}
          <div className="admin-form-grid">
            <label className="field">
              <span>Nhãn câu hỏi</span>
              <input
                required
                maxLength={200}
                value={draft.label}
                disabled={busy}
                onChange={(e) => update({ label: e.target.value })}
              />
            </label>
          </div>
          <TopicPicker
            topics={topics}
            value={draft.topicIds}
            disabled={busy}
            onChange={(topicIds) => update({ topicIds })}
          />
          <label className="publish-controls">
            <input
              type="checkbox"
              checked={draft.published}
              disabled={busy}
              onChange={(e) => update({ published: e.target.checked })}
            />
            Xuất bản câu hỏi cho học sinh
          </label>
          <button
            type="button"
            className="text-button"
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Soạn nguồn' : 'Xem trước nội dung'}
          </button>
          {preview ? (
            <Suspense fallback={<p role="status">Đang mở bản xem trước…</p>}>
              <section className="editor-preview">
                <h3>Đề bài</h3>
                <LatexContent html={draft.statementRaw} preamble={draft.latexPreamble} />
                <h3>Lời giải</h3>
                <LatexContent
                  html={draft.solutionRaw}
                  preamble={draft.latexPreamble}
                  context={draft.statementRaw}
                />
              </section>
            </Suspense>
          ) : (
            <>
              <label className="field">
                <span>Đề bài</span>
                <textarea
                  aria-label="Đề bài"
                  required
                  rows={9}
                  maxLength={1_000_000}
                  disabled={busy}
                  value={draft.statementRaw}
                  onChange={(e) => update({ statementRaw: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Lời giải</span>
                <textarea
                  aria-label="Lời giải"
                  rows={9}
                  maxLength={1_000_000}
                  disabled={busy}
                  value={draft.solutionRaw}
                  onChange={(e) => update({ solutionRaw: e.target.value })}
                />
              </label>
              <details>
                <summary>Khai báo LaTeX cho hình vẽ</summary>
                <textarea
                  aria-label="Khai báo LaTeX câu hỏi"
                  rows={4}
                  maxLength={50_000}
                  disabled={busy}
                  value={draft.latexPreamble || ''}
                  onChange={(e) => update({ latexPreamble: e.target.value })}
                />
              </details>
            </>
          )}
        </div>
        <div className="preview-footer">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={close}>
            Hủy
          </button>
          <button className="btn btn-primary" disabled={busy}>
            Lưu câu hỏi
          </button>
        </div>
      </form>
    </dialog>
  );
}
