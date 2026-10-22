import { lazy, Suspense, useEffect, useState } from 'react';
import Header from './components/Header';
import Login from './components/Login';
import Icon from './components/Icons';
import { apiService, ApiError, clearApiCache } from './services/apiService';
import type { User } from './types';

const StudentView = lazy(() => import('./components/StudentView'));
const QuestionBank = lazy(() => import('./components/QuestionBank'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const SetupTeacher = lazy(() => import('./components/SetupTeacher'));
const Loading = () => (
  <p role="status" className="loading-state">
    <span className="loading-dot" />
    Đang tải…
  </p>
);

export default function App() {
  const [setupToken, setSetupToken] = useState<string | null>(() =>
    window.location.pathname === '/setup'
      ? new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
      : null,
  );
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(setupToken === null);
  const [settings, setSettings] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const openSetup = () => {
      if (window.location.pathname === '/setup')
        setSetupToken(new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
    };
    window.addEventListener('hashchange', openSetup);
    return () => window.removeEventListener('hashchange', openSetup);
  }, []);
  useEffect(() => {
    if (setupToken !== null) {
      // Keep the one-time credential only in memory, out of history and referrers.
      window.history.replaceState(null, '', '/setup');
      return;
    }
    let active = true;
    apiService
      .me()
      .then((value) => {
        if (active) setUser(value);
      })
      .catch((error) => {
        if (active && !(error instanceof ApiError && error.status === 401)) setError(error.message);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    try {
      localStorage.removeItem('deltascript_user');
    } catch {}
    const expired = () => {
      clearApiCache();
      setUser(null);
      setSettings(false);
      setError('Phiên đăng nhập đã hết hạn hoặc mã đã ngừng hoạt động.');
    };
    window.addEventListener('auth-expired', expired);
    return () => {
      active = false;
      window.removeEventListener('auth-expired', expired);
    };
  }, [setupToken]);
  async function logout() {
    try {
      await apiService.logout();
      setUser(null);
      setSettings(false);
      setError('');
    } catch (error) {
      setError((error as Error).message);
    }
  }
  if (setupToken !== null)
    return (
      <Suspense fallback={<Loading />}>
        <SetupTeacher
          token={setupToken}
          onComplete={(value) => {
            clearApiCache();
            window.history.replaceState(null, '', '/');
            setUser(value);
            setSetupToken(null);
            setError('');
          }}
        />
      </Suspense>
    );
  if (checking) return <Loading />;
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {user && <Header user={user} onLogout={logout} onOpenSettings={() => setSettings(true)} />}
      {error && (
        <div role="alert" className="notice notice-info app-alert">
          <Icon name="info" size={21} />
          {error}
          <button className="icon-button" onClick={() => setError('')} aria-label="Đóng thông báo">
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      <main className="flex-1 min-w-0">
        <Suspense fallback={<Loading />}>
          {!user ? (
            <Login
              onLogin={(value) => {
                clearApiCache();
                setUser(value);
                setError('');
              }}
            />
          ) : user.role === 'student' ? (
            <StudentView user={user} />
          ) : (
            <QuestionBank />
          )}
        </Suspense>
      </main>
      {settings && (
        <Suspense fallback={<Loading />}>
          <SettingsModal isOpen onClose={() => setSettings(false)} />
        </Suspense>
      )}
    </div>
  );
}
