import { useEffect, useState, type FormEvent } from 'react';
import { type ManagedTopic, type TopicSummary } from '../../../shared/content';
import { apiService } from '../../services/apiService';
import Icon from '../Icons';
import LessonEditor from './LessonEditor';
import IconPicker from './IconPicker';
import { useUnsavedChanges } from './useUnsavedChanges';
const empty = (): Partial<ManagedTopic> => ({
  title: '',
  description: '',
  category: '',
  theory: '',
  preamble: '',
  examples: '',
  examplesPreamble: '',
  icon: 'topics',
  color: 'blue',
  published: false,
});
export default function TopicManager({
  onQuestions,
  onDirtyChange,
}: {
  onQuestions: (id: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [topics, setTopics] = useState<TopicSummary[]>([]),
    [draft, setDraft] = useState<Partial<ManagedTopic> | null>(null);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [dirty, setDirty] = useState(false);
  async function load() {
    setTopics(await apiService.getTopics());
  }
  useEffect(() => {
    let live = true;
    apiService
      .getTopics()
      .then((items) => {
        if (live) setTopics(items);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, []);
  useUnsavedChanges(dirty, onDirtyChange);
  function update(value: Partial<ManagedTopic>) {
    setDraft((old) => ({ ...old, ...value }));
    setDirty(true);
    setNotice('');
  }
  function canLeave() {
    return !dirty || confirm('Bỏ các thay đổi chuyên đề chưa lưu?');
  }
  async function edit(topic?: TopicSummary) {
    if (!canLeave()) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      setDraft(topic ? await apiService.getTopic(topic.id) : empty());
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await apiService.saveTopic(draft);
      setDraft(saved);
      setDirty(false);
      await load();
      setNotice(
        saved.published
          ? 'Đã xuất bản chuyên đề cho học sinh.'
          : 'Đã lưu nháp. Học sinh chưa thấy chuyên đề này.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function move(index: number, direction: number) {
    if (busy || !canLeave()) return;
    const next = [...topics];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setBusy(true);
    setError('');
    try {
      await apiService.reorderTopics(next.map((t) => t.id));
      await load();
      setDraft(null);
      setDirty(false);
      setNotice('Đã đổi thứ tự chuyên đề.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="content-workspace">
      <div className="section-heading">
        <div>
          <span className="section-kicker">NỘI DUNG DO BẠN BIÊN SOẠN</span>
          <h2>Quản lý chuyên đề</h2>
          <p className="muted">Tạo chuyên đề, đưa bài học lên và gắn câu hỏi từ cùng một kho.</p>
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={() => void edit()}>
          <Icon name="topics" size={20} />
          Tạo chuyên đề
        </button>
      </div>
      {error && (
        <div role="alert" className="notice notice-error">
          {error}
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={async () => {
              if (!canLeave()) return;
              setBusy(true);
              try {
                await load();
                setDraft(null);
                setDirty(false);
                setError('');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Tải lại danh sách
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="notice notice-success">
          {notice}
        </p>
      )}
      {busy && (
        <p role="status" className="loading-state">
          Đang cập nhật chuyên đề…
        </p>
      )}
      {draft ? (
        <form className="surface content-editor" onSubmit={save}>
          <div className="section-heading">
            <h3>{draft.id ? 'Chỉnh sửa chuyên đề' : 'Chuyên đề mới'}</h3>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                if (canLeave()) {
                  setDraft(null);
                  setDirty(false);
                }
              }}
            >
              Quay lại danh sách
            </button>
          </div>
          <div className="admin-form-grid">
            <label className="field">
              <span>Tên chuyên đề</span>
              <input
                required
                maxLength={160}
                value={draft.title}
                disabled={busy}
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Nhóm chuyên đề</span>
              <input
                maxLength={80}
                list="topic-categories"
                value={draft.category}
                disabled={busy}
                placeholder="Ví dụ: Đại số, Hình học…"
                onChange={(e) => update({ category: e.target.value })}
              />
              <datalist id="topic-categories">
                {[...new Set(topics.map((t) => t.category))].filter(Boolean).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="field">
            <span>Mô tả ngắn</span>
            <textarea
              aria-label="Mô tả ngắn"
              rows={2}
              maxLength={500}
              value={draft.description}
              disabled={busy}
              onChange={(e) => update({ description: e.target.value })}
            />
          </label>
          <div className="admin-form-grid">
            <label className="field">
              <span>Màu thẻ</span>
              <select
                aria-label="Màu thẻ"
                value={draft.color}
                disabled={busy}
                onChange={(e) => update({ color: e.target.value as ManagedTopic['color'] })}
              >
                <option value="blue">Xanh dương</option>
                <option value="red">Đỏ san hô</option>
                <option value="yellow">Vàng</option>
              </select>
            </label>
            <IconPicker
              value={draft.icon || 'topics'}
              color={draft.color || 'blue'}
              disabled={busy}
              onChange={(icon) => update({ icon })}
            />
          </div>
          <LessonEditor
            label="Bài học / lý thuyết"
            value={draft.theory || ''}
            preamble={draft.preamble}
            disabled={busy}
            onChange={(theory, preamble) => update({ theory, preamble })}
          />
          <LessonEditor
            label="Ví dụ"
            value={draft.examples || ''}
            preamble={draft.examplesPreamble}
            disabled={busy}
            onChange={(examples, examplesPreamble) => update({ examples, examplesPreamble })}
          />
          <div className="publish-controls">
            <label>
              <input
                type="checkbox"
                checked={draft.published}
                disabled={busy}
                onChange={(e) => update({ published: e.target.checked })}
              />
              Xuất bản chuyên đề cho học sinh
            </label>
            <p className="field-help">
              Chỉ các câu hỏi đã xuất bản và được gắn vào chuyên đề mới xuất hiện bên trong.
            </p>
          </div>
          <div className="admin-actions">
            <button className="btn btn-primary" disabled={busy}>
              Lưu chuyên đề
              <Icon name="check" size={19} />
            </button>
            {draft.id && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => {
                  if (canLeave()) onQuestions(draft.id!);
                }}
              >
                Quản lý bài tập vận dụng
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="managed-topic-list">
          {topics.map((topic, index) => (
            <article key={topic.id} className="surface managed-topic-card">
              <span className={`icon-tile tone-${topic.color}`}>
                <Icon name={topic.icon} size={30} />
              </span>
              <div className="managed-topic-copy">
                <span className="topic-category">{topic.category || 'Chuyên đề'}</span>
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
                <div className="content-badges">
                  <span className={`publication-badge ${topic.published ? 'is-published' : ''}`}>
                    {topic.published ? 'Đã xuất bản' : 'Bản nháp'}
                  </span>
                  <span>{topic.questionCount} câu đã xuất bản</span>
                </div>
              </div>
              <div className="managed-topic-actions">
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void edit(topic)}
                >
                  Chỉnh sửa
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => onQuestions(topic.id)}
                >
                  Câu hỏi
                </button>
                <div>
                  <button
                    className="icon-button"
                    disabled={busy || index === 0}
                    aria-label={`Đưa lên ${topic.title}`}
                    onClick={() => void move(index, -1)}
                  >
                    <Icon name="back" size={18} className="rotate-up" />
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy || index === topics.length - 1}
                    aria-label={`Đưa xuống ${topic.title}`}
                    onClick={() => void move(index, 1)}
                  >
                    <Icon name="back" size={18} className="rotate-down" />
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={`Xóa chuyên đề ${topic.title}`}
                    onClick={async () => {
                      if (
                        !confirm(`Xóa chuyên đề “${topic.title}”? Câu hỏi trong kho vẫn được giữ.`)
                      )
                        return;
                      setBusy(true);
                      setError('');
                      try {
                        await apiService.deleteTopic(topic.id, topic.version);
                        await load();
                        setNotice('Đã xóa chuyên đề. Các câu hỏi vẫn nằm trong kho.');
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {!draft && !topics.length && !busy && !error && (
        <div className="surface empty-state">
          <Icon name="topics" size={48} />
          <h3>Bắt đầu bằng chuyên đề của bạn</h3>
          <p>Chưa có nội dung mẫu tự xuất bản. Bạn tự tạo bài học và chọn câu hỏi cho học sinh.</p>
          <button className="btn btn-primary" onClick={() => void edit()}>
            Tạo chuyên đề đầu tiên
          </button>
        </div>
      )}
    </section>
  );
}
