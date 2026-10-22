import { lazy, Suspense, useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import Icon from './Icons';

const LatexContent = lazy(() => import('./LatexContent'));
type QuestionPage = Awaited<ReturnType<typeof apiService.getTopicQuestions>>;

export default function TopicPractice({ topicId }: { topicId: string }) {
  const [result, setResult] = useState<QuestionPage | null>(null);
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setBusy(true);
    setError('');
    apiService
      .getTopicQuestions(topicId, page)
      .then((data) => {
        if (!live) return;
        const last = Math.max(1, Math.ceil(data.total / data.pageSize));
        if (data.page > last) {
          setPage(last);
          return;
        }
        setResult(data);
        setOpened(new Set());
      })
      .catch((e) => {
        if (live) setError((e as Error).message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [topicId, page, attempt]);

  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  return (
    <div className="topic-practice">
      <div className="section-heading">
        <div>
          <span className="section-kicker">CÙNG THỬ SỨC</span>
          <h3>Bài tập vận dụng</h3>
          <p className="muted">
            {result && `${result.total} bài tập · `}Tự làm bài rồi mở đáp án để đối chiếu.
          </p>
        </div>
      </div>
      {error ? (
        <div className="notice notice-error" role="alert">
          {error}
          <button className="text-button" onClick={() => setAttempt((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      ) : busy ? (
        <div className="surface loading-state question-loading" role="status">
          <span className="loading-dot" />
          Đang tải bài tập…
        </div>
      ) : result?.items.length ? (
        <Suspense fallback={<p role="status">Đang mở bài tập…</p>}>
          <div className="topic-question-list">
            {result.items.map((question, index) => {
              const showAnswer = opened.has(question.id);
              const ordinal = (result.page - 1) * result.pageSize + index + 1;
              return (
                <article
                  key={question.id}
                  className="surface exercise-card topic-exercise"
                  aria-labelledby={`topic-exercise-${question.id}`}
                >
                  <div className="exercise-heading">
                    <h4 id={`topic-exercise-${question.id}`}>Bài {ordinal}</h4>
                  </div>
                  <div className="exercise-body">
                    <LatexContent html={question.statementRaw} preamble={question.latexPreamble} />
                  </div>
                  <div className="exercise-actions">
                    <button
                      className="btn btn-primary"
                      aria-expanded={showAnswer}
                      aria-controls={`topic-solution-${question.id}`}
                      onClick={() => {
                        setOpened((previous) => {
                          const next = new Set(previous);
                          if (next.has(question.id)) next.delete(question.id);
                          else next.add(question.id);
                          return next;
                        });
                      }}
                    >
                      <Icon name="eye" size={20} />
                      {showAnswer ? 'Ẩn đáp án' : 'Đáp án'}
                    </button>
                  </div>
                  {showAnswer && (
                    <section className="solution-panel" id={`topic-solution-${question.id}`}>
                      <h5>Đáp án</h5>
                      <LatexContent
                        html={question.solutionRaw || 'Chưa có đáp án.'}
                        preamble={question.latexPreamble}
                        context={question.statementRaw}
                      />
                    </section>
                  )}
                </article>
              );
            })}
          </div>
        </Suspense>
      ) : (
        <div className="surface empty-state">
          <Icon name="practice" size={48} />
          <h4>Chưa có bài tập vận dụng</h4>
          <p>Bài tập sẽ xuất hiện khi quản trị viên gắn câu hỏi vào chuyên đề và xuất bản.</p>
        </div>
      )}
      {result && (pages > 1 || page > 1) && (
        <nav className="bank-pagination" aria-label="Phân trang bài tập vận dụng">
          <button
            className="btn btn-quiet"
            disabled={busy || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            <Icon name="back" size={19} />
            Trang trước
          </button>
          <span aria-live="polite">
            Trang {page} / {pages}
          </span>
          <button
            className="btn btn-quiet"
            disabled={busy || page >= pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Trang sau
            <Icon name="arrow" size={19} />
          </button>
        </nav>
      )}
    </div>
  );
}
