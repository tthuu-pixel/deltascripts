import { Component, type ReactNode } from 'react';
import Brand from './Brand';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="error-page">
          <Brand />
          <h1>Chưa tải được giao diện</h1>
          <p>Kiểm tra kết nối mạng rồi tải lại trang. Bài thi đã lưu trong tab này vẫn được giữ.</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Tải lại trang
          </button>
        </main>
      );
    return this.props.children;
  }
}
