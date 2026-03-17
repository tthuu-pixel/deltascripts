import React from 'react';
import { Settings, LogOut, BookOpen } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onOpenSettings }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-200">
            <BookOpen size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            DeltaScript <span className="text-indigo-600 font-medium hidden sm:inline">– Hỗ trợ học tập Toán 9</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              {user.role === 'student' ? (
                <span>{user.studentName} - {user.studentClass}</span>
              ) : (
                <span>Giáo viên</span>
              )}
            </div>
          )}
          
          <button 
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            title="Cài đặt"
          >
            <Settings size={20} />
          </button>
          
          {user && (
            <button 
              onClick={onLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
