import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import ModelPicker from './ModelPicker';
import { aiProviders, type AiProvider } from '../../shared/ai';
import { getStudentAiSettings, saveStudentAiSettings } from '../services/studentAiSettings';
import { apiService } from '../services/apiService';
export default function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState(getStudentAiSettings);
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef(0);
  useEffect(() => {
    if (!isOpen) return;
    setSettings(getStudentAiSettings());
    setModels([]);
    setStatus('');
    setError('');
    dialog.current?.showModal();
    return () => {
      request.current++;
      dialog.current?.close();
      setBusy(false);
    };
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      className="settings-dialog"
      aria-labelledby="settings-title"
    >
      <div className="settings-dialog-heading">
        <span className="icon-tile tone-blue">
          <Icon name="settings" size={27} />
        </span>
        <h2 id="settings-title">Cài đặt AI</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <Icon name="close" size={21} />
        </button>
      </div>
      <p className="settings-description">
        Chọn AI để hỏi bài và tạo bài tương tự. Key cá nhân chỉ lưu trong phiên tab này. Gemini có
        thể dùng key máy chủ nếu đã được cấu hình. Việc sử dụng API theo hạn mức tài khoản của bạn.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            saveStudentAiSettings({ ...settings, apiKey: settings.apiKey.trim() });
            setStatus('Đã lưu cấu hình AI cho phiên tab này.');
            setError('');
          } catch {
            setError('Không lưu được cấu hình trong trình duyệt.');
          }
        }}
      >
        <label className="field">
          <span>Nhà cung cấp AI</span>
          <select
            aria-label="Nhà cung cấp AI"
            disabled={busy}
            value={settings.provider}
            onChange={(e) => {
              setSettings(getStudentAiSettings(e.target.value as AiProvider));
              setModels([]);
              setStatus('');
              setError('');
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
          <span>API key</span>
          <input
            aria-label="API key"
            type="password"
            autoComplete="new-password"
            maxLength={4096}
            disabled={busy}
            value={settings.apiKey}
            placeholder="Nhập API key cá nhân"
            onChange={(e) => {
              setSettings({ ...settings, apiKey: e.target.value });
              setModels([]);
            }}
          />
        </label>
        <ModelPicker
          key={settings.provider}
          provider={settings.provider}
          value={settings.model}
          models={models}
          disabled={busy}
          onChange={(model) => setSettings({ ...settings, model })}
        />
        <p className="field-help">
          Dùng nút lấy mô hình để cập nhật danh sách từ tài khoản API. Chọn “Model khác” nếu muốn
          nhập tên phiên bản mới.
        </p>
        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={async () => {
              const id = ++request.current;
              setBusy(true);
              setStatus('');
              setError('');
              try {
                const list = await apiService.getStudentAiModels(settings);
                if (id === request.current) {
                  setModels(list);
                  setStatus(`Đã kết nối và lấy ${list.length} mô hình.`);
                }
              } catch (e) {
                if (id === request.current) setError((e as Error).message);
              } finally {
                if (id === request.current) setBusy(false);
              }
            }}
          >
            {busy ? 'Đang lấy…' : 'Kiểm tra & lấy mô hình'}
          </button>
          <button className="btn btn-primary" disabled={busy}>
            Lưu cấu hình AI
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => {
              const cleared = { ...settings, apiKey: '' };
              try {
                saveStudentAiSettings(cleared);
                setSettings(cleared);
                setModels([]);
                setError('');
                setStatus('Đã xóa key của nhà cung cấp này.');
              } catch {
                setError('Không xóa được key trong trình duyệt.');
              }
            }}
          >
            Xóa key
          </button>
        </div>
      </form>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <p role="status" className="settings-status">
        {status}
      </p>
    </dialog>
  );
}
