import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ManagedTopic, TopicSummary } from '../../shared/content';
import type { Question } from '../types';
import { apiService } from '../services/apiService';
import Icon from './Icons';
const LatexContent = lazy(() => import('./LatexContent'));
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
export default function Topics({
  topics,
  intro,
  onAsk,
}: {
  topics: TopicSummary[];
  intro: string;
  onAsk: (q: Question) => void;
}) {
  const [category, setCategory] = useState('Tất cả'),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<ManagedTopic | null>(null);
  const [items, setItems] = useState<Question[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [number, setNumber] = useState(0),
    [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const lastTopic = useRef('');
  useEffect(() => {
    if (selected && !topics.some((t) => t.id === selected)) {
      setSelected(null);
      setDetail(null);
    }
  }, [topics, selected]);
  useEffect(() => {
    if (!selected) return;
    let live = true;
    setBusy(true);
    setError('');
    setItems([]);
    setAnswers({});
    Promise.all([
      apiService.getTopic(selected),
      apiService.getTopicQuestions(selected, page, number),
    ])
      .then(([topic, list]) => {
        if (live) {
          setDetail(topic);
          setItems(list.items);
          setTotal(list.total);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [selected, page, number, attempt, topics]);
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
  const categories = ['Tất cả', ...new Set(topics.map((t) => t.category || 'Chưa phân nhóm'))];
  const filtered = topics.filter(
    (t) =>
      (category === 'Tất cả' || (t.category || 'Chưa phân nhóm') === category) &&
      normalize(t.title + ' ' + t.description + ' ' + t.category).includes(normalize(search)),
  );
  const current = topics.find((t) => t.id === selected);
  if (selected && current)
    return (
      <div className="topic-detail">
        <button
          className="text-button"
          onClick={() => {
            setSelected(null);
            setDetail(null);
          }}
        >
          <Icon name="back" size={19} />
          Tất cả chuyên đề
        </button>
        <div className="topic-detail-heading">
          <span className={`icon-tile tone-${current.color}`}>
            <Icon name={current.icon} size={40} />
          </span>
          <div>
            <span className="eyebrow">{current.category || 'CHUYÊN ĐỀ'}</span>
            <h2 id="topic-detail-title" tabIndex={-1}>
              {current.title}
            </h2>
            <p className="muted">{current.description}</p>
          </div>
        </div>
        {error && (
          <div className="notice notice-error" role="alert">
            {error}
            <button className="text-button" onClick={() => setAttempt((a) => a + 1)}>
              Thử lại
            </button>
          </div>
        )}
        {busy && (
          <p className="loading-state" role="status">
            Đang tải bài học và câu hỏi…
          </p>
        )}
        <Suspense fallback={<p role="status">Đang mở nội dung…</p>}>
          {detail?.id === selected && detail.theory && (
            <section className="surface lesson-content managed-lesson">
              <span className="section-kicker">BÀI HỌC CỦA CHUYÊN ĐỀ</span>
              <h3>Kiến thức và hướng dẫn</h3>
              <LatexContent html={detail.theory} preamble={detail.preamble} />
            </section>
          )}
          <section className="topic-practice">
            <div className="section-heading">
              <div>
                <span className="section-kicker">CÙNG LUYỆN TẬP</span>
                <h3>Câu hỏi theo chuyên đề</h3>
                <p className="muted">{busy ? 'Đang cập nhật…' : `${total} câu hỏi đã xuất bản`}</p>
              </div>
            </div>
            <div
              className="filter-chips topic-type-filters"
              aria-label="Lọc dạng câu trong chuyên đề"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  className={number === n ? 'active' : ''}
                  aria-pressed={number === n}
                  disabled={busy}
                  onClick={() => {
                    setNumber(n);
                    setPage(1);
                  }}
                >
                  {n ? `Câu ${n}` : 'Tất cả dạng'}
                </button>
              ))}
            </div>
            {!busy && !error && !items.length && (
              <div className="surface empty-state">
                <Icon name="practice" size={40} />
                <h3>Chưa có câu hỏi ở mục này</h3>
                <p>Câu hỏi sẽ xuất hiện khi quản trị viên gắn vào chuyên đề và xuất bản.</p>
              </div>
            )}
            <div className="topic-question-list">
              {items.map((q, index) => (
                <article className="surface exercise-card" key={q.id}>
                  <div className="exercise-heading">
                    <h3>
                      Bài {(page - 1) * 10 + index + 1} · {q.label}
                    </h3>
                    <span className="soft-badge">Dạng Câu {q.number}</span>
                  </div>
                  <div className="exercise-body">
                    <LatexContent html={q.statementRaw} preamble={q.latexPreamble} />
                  </div>
                  <div className="exercise-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setAnswers((old) => ({ ...old, [q.id]: !old[q.id] }))}
                    >
                      <Icon name="guide" size={18} />
                      {answers[q.id] ? 'Ẩn lời giải' : 'Xem lời giải'}
                    </button>
                    <button className="text-button" onClick={() => onAsk(q)}>
                      <Icon name="spark" size={18} />
                      Hỏi AI về câu này
                    </button>
                  </div>
                  {answers[q.id] && (
                    <section className="solution-panel">
                      <h4>Lời giải chi tiết</h4>
                      <LatexContent
                        html={q.solutionRaw || 'Chưa có lời giải.'}
                        preamble={q.latexPreamble}
                        context={q.statementRaw}
                      />
                    </section>
                  )}
                </article>
              ))}
            </div>
            {total > 10 && (
              <div className="bank-pagination">
                <button
                  className="btn btn-secondary"
                  disabled={busy || page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trang trước
                </button>
                <span>
                  Trang {page} / {Math.max(1, Math.ceil(total / 10))}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={busy || page * 10 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Trang sau
                </button>
              </div>
            )}
          </section>
        </Suspense>
      </div>
    );
  return (
    <div>
      <div className="section-heading topics-heading">
        <div>
          <span className="section-kicker">HỌC THEO NỘI DUNG CỦA LỚP</span>
          <h2>Học chắc từng chuyên đề</h2>
          <p className="muted">{intro}</p>
        </div>
        <span className="soft-badge">{topics.length} chuyên đề</span>
      </div>
      {topics.length > 0 && (
        <div className="topics-toolbar">
          <div className="filter-chips" aria-label="Nhóm chuyên đề">
            {categories.map((c) => (
              <button
                key={c}
                className={category === c ? 'active' : ''}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
      )}
      <div className="topic-grid">
        {filtered.map((topic, index) => (
          <button
            key={topic.id}
            id={`topic-card-${topic.id}`}
            className={`topic-card topic-${topic.color}`}
            onClick={() => {
              lastTopic.current = topic.id;
              setDetail(null);
              setPage(1);
              setNumber(0);
              setSelected(topic.id);
            }}
          >
            <div className="topic-card-top">
              <span className={`icon-tile tone-${topic.color}`}>
                <Icon name={topic.icon} size={35} />
              </span>
              <span className="topic-index">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <span className="topic-category">{topic.category || 'Chuyên đề'}</span>
            <h3>{topic.title}</h3>
            <p>{topic.description}</p>
            <div className="topic-card-footer">
              <span>{topic.questionCount} câu hỏi</span>
              <span className="topic-arrow">
                <Icon name="arrow" size={20} />
              </span>
            </div>
          </button>
        ))}
      </div>
      {!topics.length ? (
        <div className="empty-state surface">
          <Icon name="topics" size={48} />
          <h3>Chuyên đề đang được chuẩn bị</h3>
          <p>Bài học do quản trị viên đưa lên sẽ xuất hiện tại đây sau khi xuất bản.</p>
        </div>
      ) : (
        !filtered.length && (
          <div className="empty-state surface">
            <Icon name="search" size={40} />
            <h3>Chưa tìm thấy chuyên đề</h3>
            <p>Thử từ khóa khác hoặc xem tất cả các nhóm.</p>
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
        )
      )}
    </div>
  );
}
