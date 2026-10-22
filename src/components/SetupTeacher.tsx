import { useEffect, useState, type FormEvent } from 'react';
import Brand from './Brand';
import { apiService, ApiError } from '../services/apiService';
import type { User } from '../types';

export default function SetupTeacher({
  token,
  onComplete,
}: {
  token: string;
  onComplete: (user: User) => void;
}) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'offline'>('checking');
  const [attempt, setAttempt] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setStatus('invalid');
      setError('Hãy mở liên kết thiết lập riêng được gửi cho bạn.');
      return;
    }
    setStatus('checking');
    setError('');
    apiService.checkTeacherSetup(token).then(
      () => {
        if (active) setStatus('ready');
      },
      (error: Error) => {
        if (!active) return;
        setStatus(error instanceof ApiError && error.status === 410 ? 'invalid' : 'offline');
        setError(error.message);
      },
    );
    return () => {
      active = false;
    };
  }, [token, attempt]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || status !== 'ready') return;
    setError('');
    if (password !== confirmation) {
      setError('Hai lần nhập mật khẩu chưa khớp.');
      return;
    }
    setSaving(true);
    try {
      const user = await apiService.setupTeacher(token, email.trim(), password);
      setPassword('');
      setConfirmation('');
      onComplete(user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 410) setStatus('invalid');
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'account-input';
  return (
    <main className="account-page">
      <div className="account-card">
        <Brand />
        <h1 className="account-title">Tạo tài khoản quản trị</h1>
        {status === 'checking' && (
          <p role="status" className="mt-5 text-slate-600">
            Đang kiểm tra liên kết…
          </p>
        )}
        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
        {status === 'ready' && (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Chọn email và mật khẩu để quản lý kho câu hỏi. Liên kết này chỉ dùng một lần.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="setup-email" className="mb-2 block text-sm font-semibold">
                  Email
                </label>
                <input
                  id="setup-email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={email}
                  disabled={saving}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="setup-password" className="mb-2 block text-sm font-semibold">
                  Mật khẩu mới
                </label>
                <input
                  id="setup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={256}
                  value={password}
                  disabled={saving}
                  aria-describedby="password-help"
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                />
                <p id="password-help" className="mt-2 text-xs text-slate-500">
                  Ít nhất 12 ký tự. Hãy lưu mật khẩu để đăng nhập lần sau.
                </p>
              </div>
              <div>
                <label htmlFor="setup-confirmation" className="mb-2 block text-sm font-semibold">
                  Nhập lại mật khẩu
                </label>
                <input
                  id="setup-confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={256}
                  value={confirmation}
                  disabled={saving}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className={inputClass}
                />
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary login-submit">
                {saving ? 'Đang tạo tài khoản…' : 'Tạo tài khoản và đăng nhập'}
              </button>
            </form>
          </>
        )}
        {status === 'offline' && (
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="btn btn-primary mt-5"
          >
            Kiểm tra lại
          </button>
        )}
        <a href="/" className="account-back">
          Về trang đăng nhập
        </a>
      </div>
    </main>
  );
}
