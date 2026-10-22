import { useEffect, useState } from 'react';
import { aiProviders, type AiProvider, type AiSettings } from '../../../shared/ai';
import { apiService } from '../../services/apiService';
import { useUnsavedChanges } from './useUnsavedChanges';

export default function AiSettingsManager({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  useUnsavedChanges(dirty, onDirtyChange);
  useEffect(() => {
    let live = true;
    setError('');
    apiService
      .getAiSettings()
      .then((value) => {
        if (live) setSettings(value);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  async function run(save: boolean) {
    if (!settings) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const value = { ...settings, apiKey };
      if (save) {
        setSettings(await apiService.saveAiSettings(value));
        setApiKey('');
        setDirty(false);
        setNotice('Đã lưu cấu hình AI. API key được mã hóa ở máy chủ.');
      } else {
        const list = await apiService.testAiSettings(value);
        setModels(list);
        setNotice(
          `Đã kết nối và lấy ${list.length} model. Chọn model hỗ trợ tạo văn bản hoặc nhập tên model bạn muốn dùng.`,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface content-editor ai-settings-editor">
      <div>
        <span className="section-kicker">HỖ TRỢ NGƯỜI BIÊN SOẠN</span>
        <h2>Cấu hình AI</h2>
        <p className="muted">
          AI tự quét toàn bộ file khi nhập bài. Với kho đã có, dùng nút quét toàn bộ để tự gắn
          chuyên đề. Bản nhập mới được duyệt theo cả đợt trước khi lưu.
        </p>
      </div>
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
          {!settings && (
            <button className="text-button" onClick={() => setAttempt((v) => v + 1)}>
              Thử lại
            </button>
          )}
        </div>
      )}
      {notice && (
        <p className="notice notice-success" role="status">
          {notice}
        </p>
      )}
      {!settings ? (
        !error && <p role="status">Đang tải cấu hình AI…</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(true);
          }}
        >
          {!settings.encryptionReady && (
            <p className="notice notice-error">
              Máy chủ chưa có khóa mã hóa cấu hình AI. Cần thiết lập AI_SETTINGS_KEY trước khi lưu.
            </p>
          )}
          <div className="admin-form-grid">
            <label className="field">
              <span>Nhà cung cấp AI</span>
              <select
                aria-label="Nhà cung cấp AI"
                disabled={busy}
                value={settings.provider}
                onChange={(e) => {
                  const provider = e.target.value as AiProvider;
                  setSettings({
                    ...settings,
                    provider,
                    baseUrl: aiProviders[provider].baseUrl,
                    model: aiProviders[provider].model,
                    hasKey: false,
                  });
                  setApiKey('');
                  setModels([]);
                  setDirty(true);
                  setNotice('');
                }}
              >
                {Object.entries(aiProviders).map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Base URL</span>
              <input
                aria-label="Base URL"
                type="url"
                required
                maxLength={500}
                disabled={busy}
                value={settings.baseUrl}
                onChange={(e) => {
                  setSettings({ ...settings, baseUrl: e.target.value });
                  setDirty(true);
                  setModels([]);
                }}
              />
            </label>
            <label className="field">
              <span>API key</span>
              <input
                aria-label="API key"
                type="password"
                autoComplete="new-password"
                maxLength={4096}
                disabled={busy}
                value={apiKey}
                placeholder={
                  settings.hasKey ? 'Đã có key — để trống để giữ nguyên' : 'Nhập API key của bạn'
                }
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <label className="field">
              <span>Model</span>
              <input
                aria-label="Model"
                list="admin-ai-models"
                required
                maxLength={200}
                disabled={busy}
                value={settings.model}
                onChange={(e) => {
                  setSettings({ ...settings, model: e.target.value });
                  setDirty(true);
                }}
              />
              <datalist id="admin-ai-models">
                {models.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </label>
          </div>
          <p className="field-help">
            Tên model có thể nhập tự do để dùng các phiên bản mới. Nút kiểm tra lấy danh sách model
            từ tài khoản API của bạn. Khi đổi nhà cung cấp hoặc Base URL, hãy nhập lại key.
          </p>
          <p className="field-help">
            Khi đã lưu cấu hình, AI tự chạy với toàn bộ bản nhập; cũng chạy khi bạn quét kho hoặc
            câu đã chọn. Đề bài và chuyên đề được gửi đến dịch vụ đã chọn. API có thể tính phí theo
            tài khoản của bạn. Cấu hình này dành riêng cho phân loại trong admin.
          </p>
          <div className="review-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void run(false)}
            >
              Kiểm tra &amp; lấy model
            </button>
            <button className="btn btn-primary" disabled={busy || !settings.encryptionReady}>
              {busy ? 'Đang xử lý…' : 'Lưu cấu hình AI'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
