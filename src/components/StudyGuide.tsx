import { lazy, Suspense } from 'react';
import Icon from './Icons';
const LatexContent = lazy(() => import('./LatexContent'));
export default function StudyGuide({ title, content }: { title: string; content: string }) {
  return (
    <section className="managed-guide">
      <header className="guide-hero">
        <div>
          <span className="section-kicker">GÓC NHỎ CHO VIỆC TỰ HỌC</span>
          <h2>{title}</h2>
          <p>Đọc chậm, thử làm và chọn cách học phù hợp với mình.</p>
          <div className="guide-hero-tags">
            <span>Hiểu kiến thức</span>
            <span>Tự kiểm tra</span>
            <span>Học đều đặn</span>
          </div>
        </div>
        <div className="guide-hero-art" aria-hidden="true">
          <Icon name="guide" size={84} />
          <span>✦</span>
        </div>
      </header>
      <div className="guide-reading">
        {content ? (
          <Suspense fallback={<p role="status">Đang mở góc học tập…</p>}>
            <LatexContent html={content} />
          </Suspense>
        ) : (
          <div className="surface empty-state">
            <Icon name="guide" size={42} />
            <p>Nội dung góc học tập đang được quản trị viên chuẩn bị.</p>
          </div>
        )}
      </div>
    </section>
  );
}
