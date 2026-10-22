import { useEffect, useState, type FormEvent } from 'react';
import { defaultStudentSettings, type StudentSettings } from '../../../shared/content';
import { apiService } from '../../services/apiService';
import Icon from '../Icons';
import LessonEditor from './LessonEditor';
import { useUnsavedChanges } from './useUnsavedChanges';
export default function StudentSettingsManager({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState<StudentSettings | null>(null),
    [busy, setBusy] = useState(true),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  useUnsavedChanges(dirty, onDirtyChange);
  useEffect(() => {
    let live = true;
    apiService
      .getStudentSettings()
      .then((value) => {
        if (live) setSettings(value);
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
  function update(value: Partial<StudentSettings>) {
    setSettings((old) => old && { ...old, ...value });
    setDirty(true);
    setNotice('');
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settings || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setSettings(await apiService.saveStudentSettings(settings));
      setDirty(false);
      setNotice('Đã cập nhật trang học sinh. Các thay đổi hiển thị khi học sinh tải lại nội dung.');
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
          <span className="section-kicker">BẠN QUYẾT ĐỊNH NỘI DUNG HIỂN THỊ</span>
          <h2>Trang học sinh</h2>
          <p className="muted">Đổi lời giới thiệu, sắp xếp các tab và tự biên soạn góc học tập.</p>
        </div>
      </div>
      {error && (
        <div role="alert" className="notice notice-error">
          {error}
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={async () => {
              if (dirty && !confirm('Bỏ cấu hình chưa lưu và tải lại?')) return;
              setBusy(true);
              try {
                setSettings(await apiService.getStudentSettings());
                setDirty(false);
                setError('');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Tải lại cấu hình
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="notice notice-success">
          {notice}
        </p>
      )}
      {busy && !settings && (
        <p role="status" className="loading-state">
          Đang tải cấu hình…
        </p>
      )}
      {settings && (
        <form onSubmit={save} className="surface content-editor">
          <h3>Lời chào trên trang học sinh</h3>
          <div className="admin-form-grid">
            <label className="field">
              <span>Tiêu đề trang học sinh</span>
              <input
                required
                maxLength={160}
                disabled={busy}
                value={settings.heroTitle}
                onChange={(e) => update({ heroTitle: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Dòng phụ dưới tiêu đề</span>
              <input
                maxLength={160}
                disabled={busy}
                value={settings.heroSubtitle}
                onChange={(e) => update({ heroSubtitle: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            <span>Lời giới thiệu</span>
            <textarea
              rows={3}
              maxLength={1000}
              disabled={busy}
              aria-label="Lời giới thiệu"
              value={settings.heroIntro}
              onChange={(e) => update({ heroIntro: e.target.value })}
            />
          </label>
          <h3>Các tab học tập</h3>
          <p className="field-help">
            Đổi tên, ẩn/hiện và dùng mũi tên để đổi thứ tự. Luôn giữ ít nhất một tab hiển thị.
          </p>
          <div className="tab-settings-list">
            {settings.tabs.map((tab, index) => (
              <fieldset key={tab.key} className="tab-settings-row" disabled={busy}>
                <legend>{defaultStudentSettings.tabs.find((t) => t.key === tab.key)!.label}</legend>
                <div className="admin-form-grid">
                  <label className="field">
                    <span>Tên tab</span>
                    <input
                      required
                      maxLength={60}
                      value={tab.label}
                      onChange={(e) =>
                        update({
                          tabs: settings.tabs.map((t) =>
                            t.key === tab.key ? { ...t, label: e.target.value } : t,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Mô tả tab</span>
                    <input
                      maxLength={100}
                      value={tab.description}
                      onChange={(e) =>
                        update({
                          tabs: settings.tabs.map((t) =>
                            t.key === tab.key ? { ...t, description: e.target.value } : t,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="admin-actions">
                  <label>
                    <input
                      type="checkbox"
                      checked={tab.visible}
                      disabled={tab.visible && settings.tabs.filter((t) => t.visible).length === 1}
                      onChange={(e) =>
                        update({
                          tabs: settings.tabs.map((t) =>
                            t.key === tab.key ? { ...t, visible: e.target.checked } : t,
                          ),
                        })
                      }
                    />
                    Hiển thị cho học sinh
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Đưa tab ${tab.label} lên`}
                    disabled={index === 0}
                    onClick={() => {
                      const tabs = [...settings.tabs];
                      [tabs[index - 1], tabs[index]] = [tabs[index], tabs[index - 1]];
                      update({ tabs });
                    }}
                  >
                    <Icon name="back" size={18} className="rotate-up" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Đưa tab ${tab.label} xuống`}
                    disabled={index === 3}
                    onClick={() => {
                      const tabs = [...settings.tabs];
                      [tabs[index + 1], tabs[index]] = [tabs[index], tabs[index + 1]];
                      update({ tabs });
                    }}
                  >
                    <Icon name="back" size={18} className="rotate-down" />
                  </button>
                </div>
              </fieldset>
            ))}
          </div>
          <label className="field">
            <span>Giới thiệu danh sách chuyên đề</span>
            <textarea
              rows={2}
              maxLength={1000}
              disabled={busy}
              aria-label="Giới thiệu danh sách chuyên đề"
              value={settings.topicsIntro}
              onChange={(e) => update({ topicsIntro: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Tiêu đề góc học tập</span>
            <input
              required
              maxLength={160}
              disabled={busy}
              value={settings.guideTitle}
              onChange={(e) => update({ guideTitle: e.target.value })}
            />
          </label>
          <LessonEditor
            label="Nội dung góc học tập"
            value={settings.guideContent}
            disabled={busy}
            maxLength={100_000}
            onChange={(theory, preamble) =>
              update({ guideContent: [preamble, theory].filter(Boolean).join('\n') })
            }
          />
          <div className="admin-actions">
            <button className="btn btn-primary" disabled={busy || !dirty}>
              Lưu trang học sinh
              <Icon name="check" size={19} />
            </button>
            <span className="field-help">Lưu cấu hình sẽ áp dụng cho trang học sinh.</span>
          </div>
        </form>
      )}
    </section>
  );
}
