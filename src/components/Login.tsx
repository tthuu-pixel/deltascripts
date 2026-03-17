import React, { useState } from 'react';
import { User } from '../types';
import { 
  GraduationCap, User as UserIcon, Lock, ArrowRight, BookOpen, KeyRound, School, LogIn,
  Sigma, Pi, Infinity as InfinityIcon, Calculator, Binary, Info, UserCheck, MapPin, Phone
} from 'lucide-react';
import { googleSheetsService } from '../services/googleSheetsService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const isValid = await googleSheetsService.validateAccessCode(accessCode);
      if (isValid) {
        await googleSheetsService.saveStudentLogin(studentName, studentClass, accessCode);
        onLogin({ role: 'student', studentName, studentClass, accessCode });
      } else {
        setError('Mã vào ôn tập không hợp lệ hoặc đã bị xóa.');
      }
    } catch (err) {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'tthuu@thcsntp.edu.vn' && password === '20030608') {
      onLogin({ role: 'teacher' });
    } else {
      setError('Email hoặc mật khẩu không đúng.');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Left Panel - Math Theme Decoration */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 xl:p-20">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 opacity-30">
          <img 
            src="https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=2070&auto=format&fit=crop" 
            alt="Math Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        </div>

        {/* Floating Math Symbols & Geometry */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Sigma className="absolute top-1/4 left-1/4 text-white/10 w-32 h-32 transform -rotate-12" />
          <Pi className="absolute top-1/3 right-1/4 text-emerald-400/10 w-24 h-24 transform rotate-12" />
          <InfinityIcon className="absolute bottom-1/4 left-1/3 text-white/10 w-40 h-40 transform -rotate-6" />
          <Binary className="absolute bottom-1/3 right-1/5 text-amber-400/10 w-20 h-20 transform rotate-45" />
          
          {/* Vector / Geometry SVG */}
          <svg className="absolute top-20 right-10 text-white/5 w-64 h-64 transform rotate-12" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="50,10 90,90 10,90" />
            <line x1="50" y1="10" x2="50" y2="90" strokeDasharray="4" />
            <circle cx="50" cy="65" r="25" />
            <path d="M 50 65 L 75 65" strokeDasharray="2" />
            <text x="60" y="60" fontSize="8" fill="currentColor" stroke="none">R</text>
          </svg>

          {/* Coordinate System SVG */}
          <svg className="absolute bottom-20 left-10 text-white/5 w-56 h-56 transform -rotate-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="10" y1="50" x2="90" y2="50" />
            <line x1="50" y1="10" x2="50" y2="90" />
            <path d="M 10 90 Q 50 10 90 90" />
            <path d="M 20 20 Q 50 80 80 20" strokeDasharray="4" />
            <text x="92" y="54" fontSize="8" fill="currentColor" stroke="none">x</text>
            <text x="44" y="8" fontSize="8" fill="currentColor" stroke="none">y</text>
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white mb-8">
            <div className="bg-emerald-500/20 p-2.5 rounded-xl backdrop-blur-md border border-emerald-500/30">
              <BookOpen size={28} className="text-emerald-400" />
            </div>
            <span className="text-2xl font-bold tracking-wider font-serif">DeltaScript</span>
          </div>
          
          <div className="mt-24">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6 font-serif uppercase">
              Học tập và luyện tập <br/>
              <span className="text-emerald-400">môn Toán 9</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-md leading-relaxed">
              Nền tảng hỗ trợ học tập và ôn thi môn Toán lớp 9. Nơi học tập, hỗ trợ, luyện tập và thi thử kì thi tuyển sinh vào lớp 10 tại Thành phố Hồ Chí Minh.
            </p>
          </div>
        </div>

        {/* System Information Block */}
        <div className="relative z-10 mt-auto pt-12">
          <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 text-slate-300 max-w-md">
            <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold uppercase tracking-wider text-sm">
              <Info size={18} />
              <h3>Thông tin hệ thống</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <UserCheck size={18} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="block text-slate-400 text-xs mb-0.5 uppercase tracking-wider">Phát triển hệ thống</span>
                  <span className="text-white font-medium text-base">Thầy Trương Trọng Hữu – Giáo viên Toán</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-slate-400 mt-0.5 shrink-0" />
                <span className="text-white leading-relaxed">Trường THCS Nguyễn Tri Phương – Phường Diên Hồng (Quận 10)</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-slate-400 shrink-0" />
                <span className="text-white">Liên hệ: <span className="font-medium text-emerald-400">0906.773.516</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white lg:bg-slate-50">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="bg-emerald-500 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-200 mb-5">
              <BookOpen size={36} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-serif">
              DeltaScript
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Hỗ trợ học tập Toán 9
            </p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="text-3xl font-bold text-slate-900 font-serif">Xin chào các bạn</h2>
            <p className="text-slate-500 mt-2">Vui lòng đăng nhập để tiếp tục hành trình học tập.</p>
          </div>

          <div className="bg-white py-8 px-6 shadow-2xl shadow-slate-200/40 sm:rounded-3xl sm:px-10 border border-slate-100">
            {/* Role Switcher */}
            <div className="flex p-1.5 bg-slate-100/80 rounded-xl mb-8">
              <button
                onClick={() => { setRole('student'); setError(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 ${
                  role === 'student' 
                    ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <GraduationCap size={18} />
                Học sinh
              </button>
              <button
                onClick={() => { setRole('teacher'); setError(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 ${
                  role === 'teacher' 
                    ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <UserIcon size={18} />
                Giáo viên
              </button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="mt-0.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                </div>
                {error}
              </div>
            )}

            {role === 'student' ? (
              <form onSubmit={handleStudentLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="appearance-none block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-900"
                      placeholder="Nhập họ và tên..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Lớp
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <School className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      className="appearance-none block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-900"
                      placeholder="Ví dụ: 9A1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Mã vào ôn tập
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      maxLength={8}
                      className="appearance-none block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono tracking-widest font-bold text-slate-900 uppercase"
                      placeholder="8 KÝ TỰ"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-emerald-500/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all mt-8 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                >
                  {loading ? 'Đang kiểm tra...' : 'Vào học tập'}
                  {!loading && <LogIn size={18} />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleTeacherLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-900"
                      placeholder="tthuu@thcsntp.edu.vn"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-900"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-emerald-500/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all mt-8 hover:-translate-y-0.5"
                >
                  Đăng nhập
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
          
          <p className="text-center text-slate-400 text-xs mt-8">
            © {new Date().getFullYear()} DeltaScript. Nền tảng học tập Toán 9.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
