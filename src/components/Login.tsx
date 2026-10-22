import React, { useState } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';
import Brand from './Brand';
import Icon from './Icons';
import MathScene from './MathScene';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<'student' | 'teacher'>(() =>
    window.location.pathname === '/admin' ? 'teacher' : 'student',
  );
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!studentName.trim() || !studentClass.trim() || !accessCode.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    if (accessCode.length !== 8) {
      setError('Mã vào ôn tập phải có đúng 8 ký tự.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      onLogin(
        await apiService.loginStudent(studentName.trim(), studentClass.trim(), accessCode.trim()),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      onLogin(await apiService.loginTeacher(email.trim(), password));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-page">
      <header className="welcome-header page-width">
        <a href="/" aria-label="DeltaScript – Trang chủ">
          <Brand />
        </a>
        <nav aria-label="Giới thiệu" className="welcome-nav">
          <a href="#cach-hoc">Cách học cùng DeltaScript</a>
          <a href="#ve-deltascript">
            Về chúng mình <Icon name="arrow" size={17} />
          </a>
        </nav>
        <span className="grade-stamp">
          TOÁN <strong>9</strong>
        </span>
      </header>
      <main className="page-width welcome-layout">
        <section className="welcome-story">
          <div className="eyebrow">
            <span className="tiny-spark">✦</span> HỌC TOÁN THEO CÁCH CỦA BẠN
          </div>
          <h1>
            Một chút tò mò.
            <br />
            Một bước <span>tiến xa.</span>
          </h1>
          <p className="welcome-intro">
            Học theo chuyên đề của lớp, thử sức với câu hỏi và tự tin vào phòng thi. Hành trình của
            bạn bắt đầu từ đây.
          </p>
          <div className="welcome-visual">
            <MathScene />
            <span className="visual-note">
              <Icon name="check" size={17} /> Hiểu bài, không chỉ thuộc bài.
            </span>
          </div>
          <div className="welcome-caption">
            <span className="tricolor-dots">
              <i />
              <i />
              <i />
            </span>{' '}
            Mỗi ngày học một chút. Mỗi ngày tiến xa hơn.
          </div>
        </section>
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-top">
            <span className="icon-tile tone-blue">
              <Icon name={role === 'student' ? 'school' : 'key'} size={29} />
            </span>
            <span className="small-label">RẤT VUI ĐƯỢC GẶP BẠN!</span>
          </div>
          <h2 id="login-title">
            {role === 'student' ? 'Sẵn sàng học thôi!' : 'Không gian quản trị'}
          </h2>
          <p className="muted">
            {role === 'student'
              ? 'Mang theo một chút tập trung, phần còn lại để DeltaScript đồng hành.'
              : 'Nơi chuẩn bị những bài học thật hay cho học sinh.'}
          </p>
          <div className="role-picker" aria-label="Chọn vai trò">
            <button
              type="button"
              disabled={loading}
              className={role === 'student' ? 'active' : ''}
              aria-pressed={role === 'student'}
              onClick={() => {
                setRole('student');
                setError('');
              }}
            >
              <Icon name="school" size={22} /> Học sinh
            </button>
            <button
              type="button"
              disabled={loading}
              className={role === 'teacher' ? 'active' : ''}
              aria-pressed={role === 'teacher'}
              onClick={() => {
                setRole('teacher');
                setError('');
              }}
            >
              <Icon name="guide" size={22} /> Quản trị
            </button>
          </div>
          {error && (
            <div role="alert" className="notice notice-error">
              <Icon name="info" size={20} />
              {error}
            </div>
          )}
          {role === 'student' ? (
            <form onSubmit={handleStudentLogin} className="login-form">
              <label className="field" htmlFor="student-name">
                <span>Họ và tên của bạn</span>
                <span className="input-wrap">
                  <Icon name="user" size={20} />
                  <input
                    id="student-name"
                    autoComplete="name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Nhập họ và tên..."
                    disabled={loading}
                  />
                </span>
              </label>
              <div className="field-row">
                <label className="field" htmlFor="student-class">
                  <span>Lớp</span>
                  <span className="input-wrap">
                    <Icon name="school" size={20} />
                    <input
                      id="student-class"
                      autoComplete="off"
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      placeholder="Ví dụ: 9A1"
                      disabled={loading}
                    />
                  </span>
                </label>
                <label className="field" htmlFor="student-code">
                  <span>Mã ôn tập</span>
                  <span className="input-wrap">
                    <Icon name="key" size={20} />
                    <input
                      id="student-code"
                      className="code-input"
                      autoComplete="off"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      maxLength={8}
                      placeholder="8 KÝ TỰ"
                      disabled={loading}
                    />
                  </span>
                </label>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary login-submit">
                {loading ? 'Đang kiểm tra...' : 'Vào học tập'}
                <Icon name="arrow" size={22} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeacherLogin} className="login-form">
              <label className="field" htmlFor="teacher-email">
                <span>Email quản trị</span>
                <span className="input-wrap">
                  <Icon name="user" size={20} />
                  <input
                    id="teacher-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email quản trị"
                    autoComplete="username"
                    disabled={loading}
                  />
                </span>
              </label>
              <label className="field" htmlFor="teacher-password">
                <span>Mật khẩu</span>
                <span className="input-wrap">
                  <Icon name="lock" size={20} />
                  <input
                    id="teacher-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu của bạn"
                    disabled={loading}
                  />
                </span>
              </label>
              <button type="submit" disabled={loading} className="btn btn-primary login-submit">
                {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
                <Icon name="arrow" size={22} />
              </button>
            </form>
          )}
          <p className="login-footnote">
            <Icon name="shield" size={17} />
            {role === 'student'
              ? 'Sử dụng mã ôn tập do giáo viên cung cấp.'
              : 'Dành cho quản trị viên đã có tài khoản.'}
          </p>
          <div className="login-divider" />
          <p className="login-quote">
            “Toán học bắt đầu từ những câu hỏi.”<span>Hãy cứ tò mò, bạn nhé.</span>
          </p>
        </section>
      </main>
      <section
        id="cach-hoc"
        className="page-width welcome-features"
        aria-label="Cách học cùng DeltaScript"
      >
        <div>
          <span className="icon-tile tone-blue">
            <Icon name="topics" size={28} />
          </span>
          <span>
            <h2>Học theo chuyên đề</h2>
            <p>Gỡ từng nút thắt, vững từng kiến thức.</p>
          </span>
          <span className="feature-no">01</span>
        </div>
        <div>
          <span className="icon-tile tone-red">
            <Icon name="practice" size={28} />
          </span>
          <span>
            <h2>Luyện câu hỏi</h2>
            <p>Tự giải, đối chiếu, rồi tiến bộ.</p>
          </span>
          <span className="feature-no">02</span>
        </div>
        <div>
          <span className="icon-tile tone-yellow">
            <Icon name="exam" size={28} />
          </span>
          <span>
            <h2>Thử sức với đề thi</h2>
            <p>Làm quen áp lực, tự tin về đích.</p>
          </span>
          <span className="feature-no">03</span>
        </div>
      </section>
      <footer id="ve-deltascript" className="page-width welcome-footer">
        <span>© {new Date().getFullYear()} DeltaScript · Làm Toán bằng sự tò mò.</span>
        <details>
          <summary>Thầy Trương Trọng Hữu &amp; DeltaScript</summary>
          <p>
            Giáo viên Toán · THCS Nguyễn Tri Phương, Phường Diên Hồng (Quận 10).
            <br />
            Liên hệ: <a href="tel:0906773516">0906.773.516</a>
          </p>
        </details>
      </footer>
    </div>
  );
};
export default Login;
