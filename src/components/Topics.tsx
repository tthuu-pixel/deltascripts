import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { topics, type Topic } from '../data/topics';
import { readStorage, writeStorage } from '../utils/storage';
import Icon from './Icons';
const LatexContent = lazy(() => import('./LatexContent'));
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

export default function Topics({ storageKey }: { storageKey: string }) {
  const [category, setCategory] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Topic | null>(null);
  const lastTopic = useRef('');
  useEffect(() => {
    if (!selected && !lastTopic.current) return;
    const target = document.getElementById(
      selected ? 'topic-detail-title' : `topic-card-${lastTopic.current}`,
    );
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({
      block: selected ? 'start' : 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }, [selected]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState('');
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    const saved = readStorage<unknown>(storageKey, {});
    return Object.fromEntries(
      topics.map((topic) => [
        topic.id,
        !!saved &&
          typeof saved === 'object' &&
          (saved as Record<string, unknown>)[topic.id] === true,
      ]),
    );
  });
  const completedCount = Object.values(completed).filter(Boolean).length;
  const filtered = topics.filter(
    (topic) =>
      (category === 'Tất cả' || topic.category === category) &&
      normalize(topic.title + ' ' + topic.description).includes(normalize(search)),
  );
  function open(topic: Topic | null) {
    if (topic) lastTopic.current = topic.id;
    setSelected(topic);
    setAnswers({});
    setChecked(false);
    setNotice('');
  }
  function checkAnswers() {
    if (!selected || selected.quizzes.some((_, index) => answers[index] === undefined)) return;
    setChecked(true);
    if (selected.quizzes.every((quiz, index) => answers[index] === quiz.answer)) {
      const next = { ...completed, [selected.id]: true };
      setCompleted(next);
      if (!writeStorage(storageKey, next))
        setNotice('Trình duyệt chưa lưu được tiến độ. Bạn vẫn có thể tiếp tục học.');
    }
  }
  if (selected)
    return (
      <div className="topic-detail">
        <button className="text-button" onClick={() => open(null)}>
          <Icon name="back" size={19} /> Tất cả chuyên đề
        </button>
        <div className="topic-detail-heading">
          <span className={`icon-tile tone-${selected.color}`}>
            <Icon name={selected.icon} size={40} />
          </span>
          <div>
            <span className="eyebrow">CHƯƠNG {selected.chapter} · TOÁN 9 KẾT NỐI TRI THỨC</span>
            <h2 id="topic-detail-title" tabIndex={-1}>
              {selected.title}
            </h2>
            <p className="muted">{selected.description}</p>
          </div>
        </div>
        <Suspense fallback={<p role="status">Đang mở bài học…</p>}>
          <div className="lesson-layout">
            <section className="surface lesson-content">
              <span className="section-kicker">01 / NẮM KIẾN THỨC</span>
              <h3>Những điều cần nhớ</h3>
              <div className="lesson-points">
                {selected.goals.map((goal, index) => (
                  <div key={goal}>
                    <span>{index + 1}</span>
                    <LatexContent html={goal} />
                  </div>
                ))}
              </div>
              <div className="worked-example">
                <span className="eyebrow">
                  <Icon name="spark" size={18} /> MỘT VÍ DỤ NHỎ
                </span>
                <LatexContent html={selected.example} />
              </div>
            </section>
            <aside className="lesson-tip">
              <span className="icon-tile tone-yellow">
                <Icon name="guide" size={30} />
              </span>
              <h3>
                Chậm một chút,
                <br />
                hiểu sâu một chút.
              </h3>
              <p>Đọc ví dụ, che lời giải và tự làm lại. Khi đã hiểu, thử hai câu bên dưới nhé.</p>
              <p className="local-progress-note">
                <Icon name="info" size={16} /> Tiến độ chuyên đề được lưu trên trình duyệt này.
              </p>
            </aside>
          </div>
          <section className="surface quiz-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">02 / THỬ MỘT CHÚT</span>
                <h3>Tự kiểm tra kiến thức</h3>
              </div>
              <span className="soft-badge">{selected.quizzes.length} câu hỏi</span>
            </div>
            {selected.quizzes.map((quiz, index) => (
              <fieldset className="quiz-question" key={quiz.question}>
                <legend>
                  <span className="quiz-number">{index + 1}</span>
                  <LatexContent html={quiz.question} />
                </legend>
                <div className="quiz-options">
                  {quiz.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className={`quiz-option ${answers[index] === optionIndex ? 'is-chosen' : ''} ${checked && optionIndex === quiz.answer ? 'is-correct' : checked && answers[index] === optionIndex ? 'is-wrong' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`quiz-${selected.id}-${index}`}
                        value={optionIndex}
                        checked={answers[index] === optionIndex}
                        disabled={checked}
                        onChange={() =>
                          setAnswers((values) => ({ ...values, [index]: optionIndex }))
                        }
                      />
                      <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                      <LatexContent html={option} />
                      {checked && optionIndex === quiz.answer && <Icon name="check" size={20} />}
                    </label>
                  ))}
                </div>
                {checked && (
                  <div className="quiz-explanation">
                    <Icon name="info" size={19} />
                    <LatexContent html={quiz.explanation} />
                  </div>
                )}
              </fieldset>
            ))}
            <div className="quiz-actions">
              <button
                className="btn btn-primary"
                disabled={!checked && Object.keys(answers).length < selected.quizzes.length}
                onClick={() => (checked ? (setChecked(false), setAnswers({})) : checkAnswers())}
              >
                <Icon name={checked ? 'refresh' : 'check'} size={20} />
                {checked ? 'Làm lại' : 'Kiểm tra đáp án'}
              </button>
              {checked ? (
                <p role="status">
                  {selected.quizzes.every((quiz, index) => answers[index] === quiz.answer)
                    ? 'Bạn đã hoàn thành chuyên đề này. Làm tốt lắm!'
                    : 'Cùng xem giải thích rồi thử lại nhé.'}
                </p>
              ) : (
                <p className="muted">Chọn đáp án cho cả hai câu để kiểm tra.</p>
              )}
            </div>
            {notice && (
              <p role="status" className="notice notice-info">
                {notice}
              </p>
            )}
          </section>
        </Suspense>
      </div>
    );
  return (
    <div>
      <div className="section-heading topics-heading">
        <div>
          <span className="section-kicker">MỖI CHUYÊN ĐỀ, MỘT BƯỚC VỮNG HƠN</span>
          <h2>Học chắc từng chuyên đề</h2>
          <p className="muted">
            10 chương theo Toán 9 Kết nối tri thức. Chọn một chương để bắt đầu.
          </p>
        </div>
        <div className="progress-pill">
          <span
            className="progress-ring"
            style={{ '--progress': `${(completedCount / topics.length) * 100}%` } as CSSProperties}
          >
            <Icon name="check" size={19} />
          </span>
          <span>
            <strong>
              {completedCount}/{topics.length} chuyên đề
            </strong>
            <small>đã hoàn thành trên thiết bị này</small>
          </span>
        </div>
      </div>
      <div className="topics-toolbar">
        <div className="filter-chips" aria-label="Nhóm chuyên đề">
          {['Tất cả', 'Đại số', 'Hình học', 'Thống kê'].map((item) => (
            <button
              key={item}
              className={category === item ? 'active' : ''}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Icon name="search" size={20} />
          <input
            aria-label="Tìm chuyên đề"
            placeholder="Bạn muốn học gì?"
            value={search}
            maxLength={100}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="topic-grid">
        {filtered.map((topic) => (
          <button
            key={topic.id}
            id={`topic-card-${topic.id}`}
            className={`topic-card topic-${topic.color}`}
            onClick={() => open(topic)}
          >
            <div className="topic-card-top">
              <span className={`icon-tile tone-${topic.color}`}>
                <Icon name={topic.icon} size={35} />
              </span>
              <span className="topic-index">{topic.chapter}</span>
            </div>
            <span className="topic-category">
              Chương {topic.chapter} · {topic.category}
            </span>
            <h3>{topic.title}</h3>
            <p>{topic.description}</p>
            <div className="topic-card-footer">
              <span>
                {completed[topic.id] ? (
                  <>
                    <Icon name="check" size={16} /> Đã hoàn thành
                  </>
                ) : (
                  'Bài học ngắn · 2 câu tự kiểm tra'
                )}
              </span>
              <span className="topic-arrow">
                <Icon name="arrow" size={20} />
              </span>
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state surface">
          <Icon name="search" size={40} />
          <h3>Chưa tìm thấy chuyên đề</h3>
          <p>Thử từ khóa ngắn hơn hoặc xem tất cả các nhóm.</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearch('');
              setCategory('Tất cả');
            }}
          >
            Xem tất cả chuyên đề
          </button>
        </div>
      )}
      <p className="topics-footnote">
        <Icon name="info" size={17} /> Đây là các bài học nền tảng. Kho câu hỏi do giáo viên đưa lên
        nằm ở tab Luyện câu hỏi.
      </p>
    </div>
  );
}
