import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';
export default function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [key, setKey] = useState(''),
    [status, setStatus] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    try {
      setKey(sessionStorage.getItem('gemini_api_key') || '');
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('deltascript_gemini_api_key');
    } catch {}
    dialog.current?.showModal();
    return () => dialog.current?.close();
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
        <h2 id="settings-title">Cài đặt</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <Icon name="close" size={21} />
        </button>
      </div>
      <p className="settings-description">
        Nếu quản trị viên đã cấu hình Gemini trên máy chủ, bạn không cần nhập key. Key cá nhân chỉ
        được giữ trong phiên tab hiện tại và gửi tới máy chủ khi hỏi AI.
      </p>
      <label>
        Gemini API Key (tùy chọn)
        <input
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="account-input"
        />
      </label>
      <div className="settings-actions">
        <button
          className="btn btn-primary"
          onClick={() => {
            try {
              sessionStorage.setItem('gemini_api_key', key.trim());
              setStatus('Đã lưu cho phiên tab này.');
            } catch {
              setStatus('Không lưu được key trong trình duyệt.');
            }
          }}
        >
          Lưu API Key
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            try {
              sessionStorage.removeItem('gemini_api_key');
            } catch {}
            setKey('');
            setStatus('Đã xóa key.');
          }}
        >
          Xóa key
        </button>
      </div>
      <p role="status" className="settings-status">
        {status}
      </p>
    </dialog>
  );
}
