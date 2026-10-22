import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Question } from '../types';
import { apiService } from '../services/apiService';
import Icon from './Icons';
const LatexContent = lazy(() => import('./LatexContent'));
export default function TopicPractice({
  topicId,
  count,
  onAsk,
}: {
  topicId: string;
  count: number;
  onAsk: (q: Question) => void;
}) {
  const [question, setQuestion] = useState<Question | null>(null),
    [number, setNumber] = useState<number | null>(null),
    [solution, setSolution] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const requestId = useRef(0);
  useEffect(
    () => () => {
      requestId.current++;
    },
    [],
  );
  async function load(selected: number) {
    const id = ++requestId.current;
    setNumber(selected);
    setQuestion(null);
    setSolution(false);
    setError('');
    setBusy(true);
    try {
      const next = await apiService.getRandomQuestion(selected, topicId);
      if (requestId.current === id) setQuestion(next);
    } catch (e) {
      if (requestId.current === id) setError((e as Error).message);
    } finally {
      if (requestId.current === id) setBusy(false);
    }
  }
  async function similar() {
    if (!question || busy) return;
    const id = ++requestId.current;
    setBusy(true);
    setError('');
    setSolution(false);
    let key = '';
    try {
      key = sessionStorage.getItem('gemini_api_key') || '';
    } catch {}
    try {
      const next = await apiService.similarQuestion(question, key);
      if (requestId.current === id) setQuestion(next);
    } catch (e) {
      if (requestId.current === id) setError((e as Error).message);
    } finally {
      if (requestId.current === id) setBusy(false);
    }
  }
  return (
    <div className="topic-practice">
      <div className="section-heading">
        <div>
          <span className="section-kicker">CÙNG THỬ SỨC</span>
          <h3>Bài tập vận dụng</h3>
          <p className="muted">{count} câu đã xuất bản · Chọn dạng câu để bắt đầu.</p>
        </div>
      </div>
      <section className="question-picker surface" aria-label="Chọn dạng bài tập vận dụng">
        <div className="question-choices">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              className={`question-choice ${number === n ? 'active' : ''}`}
              aria-label={`Câu ${n}`}
              aria-pressed={number === n}
              disabled={busy}
              onClick={() => void load(n)}
            >
              <span>{String(n).padStart(2, '0')}</span>
              <strong>Câu {n}</strong>
              <Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
      </section>
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
          {number !== null && (
            <button className="text-button" disabled={busy} onClick={() => void load(number)}>
              Thử lại
            </button>
          )}
        </div>
      )}
      {busy ? (
        <div className="surface loading-state question-loading" role="status">
          <span className="loading-dot" />
          Đang chuẩn bị bài tập…
        </div>
      ) : question ? (
        <Suspense fallback={<p role="status">Đang mở bài tập…</p>}>
          <article className="surface exercise-card topic-exercise">
            <div className="exercise-heading">
              <div className="exercise-label">
                <span className="icon-tile tone-blue">
                  <Icon name="practice" size={24} />
                </span>
                <div>
                  <small>DẠNG CÂU {question.number}</small>
                  <h3>{question.label}</h3>
                </div>
              </div>
              <button className="btn btn-quiet" onClick={() => void load(question.number)}>
                <Icon name="refresh" size={19} />
                Lấy câu hỏi khác
              </button>
            </div>
            <div className="exercise-body">
              <LatexContent html={question.statementRaw} preamble={question.latexPreamble} />
            </div>
            <div className="exercise-actions">
              <button
                className="btn btn-primary"
                aria-expanded={solution}
                aria-controls={`topic-solution-${question.id}`}
                onClick={() => setSolution((value) => !value)}
              >
                <Icon name="eye" size={20} />
                {solution ? 'Ẩn lời giải' : 'Xem lời giải'}
              </button>
              <button className="btn btn-secondary" disabled={busy} onClick={() => void similar()}>
                <Icon name="spark" size={19} />
                Bài tập tương tự
              </button>
              <button className="text-button" onClick={() => onAsk(question)}>
                <Icon name="spark" size={19} />
                Hỏi AI về câu này
              </button>
            </div>
            {solution && (
              <section className="solution-panel" id={`topic-solution-${question.id}`}>
                <h4>Lời giải chi tiết</h4>
                <LatexContent
                  html={question.solutionRaw || 'Chưa có lời giải.'}
                  preamble={question.latexPreamble}
                  context={question.statementRaw}
                />
              </section>
            )}
          </article>
        </Suspense>
      ) : (
        !error && (
          <div className="surface empty-state">
            <Icon name="practice" size={48} />
            <h3>{count ? 'Chọn một dạng để luyện tập' : 'Bài tập vận dụng đang được chuẩn bị'}</h3>
            <p>
              {count
                ? 'Chọn Câu 1 đến Câu 7 phía trên. Mỗi lần lấy một bài thuộc chuyên đề này.'
                : 'Bài tập sẽ xuất hiện khi quản trị viên gắn câu hỏi vào chuyên đề và xuất bản.'}
            </p>
          </div>
        )
      )}
    </div>
  );
}
