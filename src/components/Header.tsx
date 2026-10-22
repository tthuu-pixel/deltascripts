import React from 'react';
import { User } from '../types';
import Brand from './Brand';
import Icon from './Icons';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onOpenSettings }) => {
  return (
    <header className="app-header">
      <div className="page-width app-header-inner">
        <a href="/" aria-label="DeltaScript – Trang chủ">
          <Brand />
        </a>
        <span className="header-message">
          <span className="tiny-spark">✦</span> Mỗi ngày một bước tiến.
        </span>
        <div className="header-actions">
          {user && (
            <div className="user-badge">
              <span className="user-avatar">
                {user.role === 'teacher'
                  ? 'GV'
                  : user.studentName?.trim().split(/\s+/).at(-1)?.slice(0, 1).toUpperCase() || 'HS'}
              </span>
              <span>
                <strong>{user.role === 'teacher' ? 'Giáo viên' : user.studentName}</strong>
                <small>
                  {user.role === 'teacher'
                    ? 'Không gian quản lý'
                    : `Học sinh · Lớp ${user.studentClass}`}
                </small>
              </span>
            </div>
          )}
          <button
            onClick={onOpenSettings}
            className="icon-button"
            title="Cài đặt"
            aria-label="Cài đặt"
          >
            <Icon name="settings" size={22} />
          </button>
          {user && (
            <button
              onClick={onLogout}
              className="icon-button logout-button"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <Icon name="logout" size={22} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
