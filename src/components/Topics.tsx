import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ManagedTopic, TopicSummary } from '../../shared/content';
import type { Question } from '../types';
import { apiService } from '../services/apiService';
import Icon from './Icons';
const TopicPractice = lazy(() => import('./TopicPractice'));
const topicSections = [
  { key: 'theory', label: 'Lý thuyết', icon: 'guide' },
  { key: 'examples', label: 'Ví dụ', icon: 'geometry' },
  { key: 'practice', label: 'Bài tập vận dụng', icon: 'practice' },
] as const;
type TopicSection = (typeof topicSections)[number]['key'];
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
  const [section, setSection] = useState<TopicSection>('theory');
  const [practiceOpened, setPracticeOpened] = useState(false);
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
    apiService
      .getTopic(selected)
      .then((topic) => {
        if (live) setDetail(topic);
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
  }, [selected, attempt, topics]);
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
            Đang tải nội dung chuyên đề…
          </p>
        )}
        <nav className="topic-section-tabs" role="tablist" aria-label="Các mục của chuyên đề">
          {topicSections.map((item, index) => (
            <button
              type="button"
              role="tab"
              key={item.key}
              id={`topic-section-${item.key}`}
              aria-controls={`topic-panel-${item.key}`}
              aria-selected={section === item.key}
              tabIndex={section === item.key ? 0 : -1}
              className={`topic-section-tab ${section === item.key ? 'is-active' : ''}`}
              onClick={() => {
                setSection(item.key);
                if (item.key === 'practice') setPracticeOpened(true);
              }}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === 'ArrowRight') next = (index + 1) % 3;
                else if (event.key === 'ArrowLeft') next = (index + 2) % 3;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = 2;
                else return;
                event.preventDefault();
                const key = topicSections[next].key;
                setSection(key);
                if (key === 'practice') setPracticeOpened(true);
                document.getElementById(`topic-section-${key}`)?.focus();
              }}
            >
              <Icon name={item.icon} size={24} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <Suspense fallback={<p role="status">Đang mở nội dung…</p>}>
          <div
            role="tabpanel"
            id="topic-panel-theory"
            aria-labelledby="topic-section-theory"
            hidden={section !== 'theory'}
          >
            {section === 'theory' && detail?.id === selected && (
              <section className="surface lesson-content managed-lesson">
                <h3>Lý thuyết</h3>
                {detail.theory ? (
                  <LatexContent html={detail.theory} preamble={detail.preamble} />
                ) : (
                  <div className="empty-state">
                    <Icon name="guide" size={42} />
                    <p>Lý thuyết của chuyên đề đang được quản trị viên chuẩn bị.</p>
                  </div>
                )}
              </section>
            )}
          </div>
          <div
            role="tabpanel"
            id="topic-panel-examples"
            aria-labelledby="topic-section-examples"
            hidden={section !== 'examples'}
          >
            {section === 'examples' && detail?.id === selected && (
              <section className="surface lesson-content managed-examples">
                <h3>Ví dụ</h3>
                {detail.examples ? (
                  <LatexContent html={detail.examples} preamble={detail.examplesPreamble} />
                ) : (
                  <div className="empty-state">
                    <Icon name="geometry" size={42} />
                    <p>Ví dụ của chuyên đề đang được quản trị viên chuẩn bị.</p>
                  </div>
                )}
              </section>
            )}
          </div>
          <div
            role="tabpanel"
            id="topic-panel-practice"
            aria-labelledby="topic-section-practice"
            hidden={section !== 'practice'}
          >
            {practiceOpened && (
              <TopicPractice
                key={selected}
                topicId={selected}
                count={current.questionCount}
                onAsk={onAsk}
              />
            )}
          </div>
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
              setSection('theory');
              setPracticeOpened(false);
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
