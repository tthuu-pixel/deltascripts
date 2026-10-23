import { useEffect, useState, type FormEvent } from 'react';
import type { ExamSettings } from '../../../shared/exam';
import type { TopicSummary } from '../../../shared/content';
import { apiService } from '../../services/apiService';
import TopicPicker from './TopicPicker';
import Icon from '../Icons';
import { useUnsavedChanges } from './useUnsavedChanges';

export default function ExamSettingsManager({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState<ExamSettings | null>(null);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [counts, setCounts] = useState<number[]>([]);
  const [busy, setBusy] = useState(true),
    [dirty, setDirty] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  useUnsavedChanges(dirty, onDirtyChange);
  async function load() {
    setBusy(true);
    setError('');
    try {
      const [data, list] = await Promise.all([
        apiService.getExamSettings(),
        apiService.getTopics(),
      ]);
      setSettings(data.settings);
      setCounts(data.counts);
      setTopics(list);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settings || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await apiService.saveExamSettings(settings);
      setSettings(data.settings);
      setCounts(data.counts);
      setDirty(false);
      setNotice(
        'Đã lưu cấu hình. Học sinh tạo đề mới sẽ nhận một câu cho mỗi vị trí theo chuyên đề đã chọn.',
      );
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
          <span className="section-kicker">GHÉP ĐỀ TỪ CÁC CHUYÊN ĐỀ</span>
          <h2>Cấu hình tạo đề</h2>
          <p className="muted">
            Mỗi vị trí lấy ngẫu nhiên một câu từ các chuyên đề bạn chọn. Một đề có 7 câu khác nhau.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => {
            if (!dirty || confirm('Bỏ cấu hình chưa lưu và tải lại?')) void load();
          }}
        >
          Tải lại cấu hình
        </button>
      </div>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice notice-success" role="status">
          {notice}
        </p>
      )}
      {busy && !settings && <p role="status">Đang tải cấu hình tạo đề…</p>}
      {settings && (
        <form onSubmit={save} className="exam-settings-form">
          <p className="notice notice-info">
            Chỉ lấy câu hỏi đã xuất bản trong chuyên đề đã xuất bản. Mô tả dưới đây hiển thị cạnh
            câu trong đề; nguồn câu hỏi được quyết định bởi các chuyên đề đã chọn.
          </p>
          <div className="exam-slot-grid">
            {settings.slots.map((slot, index) => (
              <section
                className="surface content-editor exam-slot-card"
                key={slot.position}
                aria-label={`Cấu hình Câu ${slot.position}`}
              >
                <div className="section-heading">
                  <h3>
                    <span className="quiz-number">{String(slot.position).padStart(2, '0')}</span>{' '}
                    Câu {slot.position}
                  </h3>
                  <span className="soft-badge tone-blue">
                    {dirty ? 'Chưa lưu thay đổi' : `${counts[index] || 0} câu có thể lấy`}
                  </span>
                </div>
                <label className="field">
                  <span>Mô tả Câu {slot.position}</span>
                  <textarea
                    aria-label={`Mô tả Câu ${slot.position}`}
                    rows={3}
                    maxLength={500}
                    disabled={busy}
                    value={slot.description}
                    placeholder="Ví dụ: Giải bài toán thực tế bằng cách lập phương trình"
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        slots: settings.slots.map((item, i) =>
                          i === index ? { ...item, description: e.target.value } : item,
                        ),
                      });
                      setDirty(true);
                      setNotice('');
                    }}
                  />
                </label>
                <TopicPicker
                  topics={topics}
                  label={`Chuyên đề cho Câu ${slot.position}`}
                  value={slot.topicIds}
                  disabled={busy}
                  onChange={(topicIds) => {
                    setSettings({
                      ...settings,
                      slots: settings.slots.map((item, i) =>
                        i === index ? { ...item, topicIds } : item,
                      ),
                    });
                    setDirty(true);
                    setNotice('');
                  }}
                />
                {slot.topicIds.filter((id) => !topics.some((topic) => topic.id === id)).length >
                  0 && (
                  <p className="notice notice-error">
                    Có chuyên đề đã bị xóa.{' '}
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        setSettings({
                          ...settings,
                          slots: settings.slots.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  topicIds: item.topicIds.filter((id) =>
                                    topics.some((topic) => topic.id === id),
                                  ),
                                }
                              : item,
                          ),
                        });
                        setDirty(true);
                      }}
                    >
                      Bỏ chuyên đề đã xóa
                    </button>
                  </p>
                )}
                {!slot.topicIds.length && (
                  <p className="field-help">
                    Chọn ít nhất một chuyên đề để dùng vị trí này khi tạo đề.
                  </p>
                )}
              </section>
            ))}
          </div>
          <div className="admin-actions">
            <button className="btn btn-primary" disabled={busy || !dirty}>
              Lưu cấu hình tạo đề <Icon name="check" size={19} />
            </button>
            <span className="field-help">
              Có thể lưu cấu hình đang soạn; cần chọn chuyên đề cho đủ 7 vị trí trước khi tạo đề.
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
