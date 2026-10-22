import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Question, User } from '../types';
import { apiService } from '../services/apiService';
import {
  EXAM_DURATION,
  formatTime,
  remainingSeconds,
  validExam,
  type SavedExam,
} from '../utils/exam';
import { readStorage, writeStorage } from '../utils/storage';
import Icon, { type IconName } from './Icons';
import MathScene from './MathScene';
const Topics = lazy(() => import('./Topics'));
const studyTabs: {
  key: 'topics' | 'practice' | 'exam' | 'guide';
  label: string;
  description: string;
  icon: IconName;
  color: string;
}[] = [
  {
    key: 'topics',
    label: 'Chuyên đề lớp 9',
    description: 'Hiểu chắc từ gốc',
    icon: 'topics',
    color: 'blue',
  },
  {
    key: 'practice',
    label: 'Luyện câu hỏi',
    description: 'Rèn từng dạng bài',
    icon: 'practice',
    color: 'red',
  },
  {
    key: 'exam',
    label: 'Tạo đề thi',
    description: 'Thử sức, bứt phá',
    icon: 'exam',
    color: 'yellow',
  },
  {
    key: 'guide',
    label: 'Góc học tập',
    description: 'Học sao cho hiệu quả?',
    icon: 'guide',
    color: 'blue',
  },
];
const LatexContent = lazy(() => import('./LatexContent'));
const AIAssistantPanel = lazy(() => import('./AIAssistantPanel'));
const button = 'btn btn-secondary';
function ExamTimer({ endAt }: { endAt: number | null }) {
  const [seconds, setSeconds] = useState(endAt ? remainingSeconds(endAt) : 7200);
  useEffect(() => {
    const update = () => setSeconds(endAt ? remainingSeconds(endAt) : 7200);
    update();
    if (!endAt) return;
    const id = setInterval(update, 1000);
    const wake = () => update();
    document.addEventListener('visibilitychange', wake);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [endAt]);
  return (
    <span role="timer" className="exam-timer">
      {formatTime(seconds)}
      {endAt && seconds === 0 ? ' – Đã hết giờ' : ''}
    </span>
  );
}
export default function StudentView({ user }: { user: User }) {
  const tabStorageKey = `deltascript_tab:${user.studentName}:${user.studentClass}`;
  const [tab, setTab] = useState<'topics' | 'practice' | 'exam' | 'guide'>(() => {
    const saved = readStorage<unknown>(tabStorageKey, 'topics', sessionStorage);
    return studyTabs.find((item) => item.key === saved)?.key || 'topics';
  });
  useEffect(() => {
    writeStorage(tabStorageKey, tab, sessionStorage);
  }, [tab, tabStorageKey]);
  const [question, setQuestion] = useState<Question | null>(null),
    [solution, setSolution] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [aiQuestion, setAiQuestion] = useState<Question | null>(null),
    [mobileAI, setMobileAI] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [aiLoaded, setAiLoaded] = useState(false);
  const assistantDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = assistantDialog.current;
    if (mobileAI && aiLoaded) {
      if (!dialog?.open) dialog?.showModal();
    } else dialog?.close();
  }, [mobileAI, aiLoaded]);
  function openAssistant(q?: Question) {
    if (q) setAiQuestion(q);
    setAiLoaded(true);
    setMobileAI(true);
  }
  const storageKey = `deltascript_exam:${user.studentName}:${user.studentClass}`;
  const [exam, setExam] = useState<SavedExam | null>(() => {
    const saved = readStorage<unknown>(storageKey, null, sessionStorage);
    return validExam(saved) ? saved : null;
  });
  const [storageError, setStorageError] = useState('');
  const requestId = useRef(0);
  useEffect(
    () => () => {
      requestId.current++;
    },
    [],
  );
  useEffect(() => {
    if (exam && !writeStorage(storageKey, exam, sessionStorage))
      setStorageError(
        'Không lưu được bài thi trong trình duyệt. Đừng tải lại trang khi đang làm bài.',
      );
  }, [exam, storageKey]);
  async function practice(number: number) {
    setSelectedNumber(number);
    const id = ++requestId.current;
    setBusy(true);
    setError('');
    setQuestion(null);
    setSolution(false);
    setAiQuestion(null);
    try {
      const value = await apiService.getRandomQuestion(number);
      if (id === requestId.current) {
        setQuestion(value);
        setAiQuestion(value);
      }
    } catch (error) {
      if (id === requestId.current) setError((error as Error).message);
    } finally {
      if (id === requestId.current) setBusy(false);
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
      const value = await apiService.similarQuestion(question, key);
      if (id === requestId.current) {
        setQuestion(value);
        setAiQuestion(value);
      }
    } catch (error) {
      if (id === requestId.current) setError((error as Error).message);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  async function generate() {
    if (
      exam?.endAt &&
      remainingSeconds(exam.endAt) > 0 &&
      !confirm('Bạn đang làm bài. Tạo đề mới và đặt lại đồng hồ?')
    )
      return;
    const id = ++requestId.current;
    setBusy(true);
    setError('');
    try {
      const questions = await apiService.generateExam();
      if (id !== requestId.current) return;
      const next = { questions, endAt: null, showAnswers: false, createdAt: Date.now() };
      if (!validExam(next))
        throw new Error('Đề thi phải đủ 7 dạng câu khác nhau. Vui lòng thử lại.');
      setExam(next);
      setAiQuestion(null);
    } catch (error) {
      if (id === requestId.current) setError((error as Error).message);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  function changeTab(value: typeof tab) {
    requestId.current++;
    setBusy(false);
    setError('');
    setTab(value);
    setMobileAI(false);
    setAiQuestion(value === 'practice' ? question : null);
  }
  return (
    <div className="study-page page-width">
      <section className="study-hero">
        <div className="study-hero-copy">
          <span className="eyebrow">
            XIN CHÀO, {user.studentName?.toUpperCase()} <span className="hello-dot" />
          </span>
          <h1>
            Không gian học tập<span>Của bạn. Theo cách của bạn.</span>
          </h1>
          <p>
            Vững kiến thức hôm nay.
            <br className="mobile-break" /> Tự tin cho những bước tiếp theo.
          </p>
          <div className="hero-tags">
            <span>
              <i className="dot dot-blue" /> Toán lớp 9
            </span>
            <span>
              <i className="dot dot-red" /> Ôn tập vào 10
            </span>
            <span>
              <i className="dot dot-yellow" /> Học chủ động
            </span>
          </div>
        </div>
        <div className="study-hero-art">
          <MathScene compact />
        </div>
        <span className="hero-corner-note">Cứ hỏi. Cứ thử. Cứ tiến lên.</span>
      </section>
      <nav className="study-tabs" aria-label="Học tập" role="tablist">
        {studyTabs.map((item, index) => (
          <button
            key={item.key}
            role="tab"
            id={`student-tab-${item.key}`}
            aria-controls={`student-panel-${item.key}`}
            aria-label={item.label}
            aria-selected={tab === item.key}
            tabIndex={tab === item.key ? 0 : -1}
            className={`study-tab tab-${item.color} ${tab === item.key ? 'active' : ''}`}
            onClick={() => changeTab(item.key)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
                next = (index + 1) % studyTabs.length;
              else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
                next = (index - 1 + studyTabs.length) % studyTabs.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = studyTabs.length - 1;
              else return;
              event.preventDefault();
              changeTab(studyTabs[next].key);
              document.getElementById(`student-tab-${studyTabs[next].key}`)?.focus();
            }}
          >
            <span className={`icon-tile tone-${item.color}`}>
              <Icon name={item.icon} size={30} />
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            <Icon name="chevron" size={17} />
          </button>
        ))}
      </nav>
      {error && (
        <div role="alert" className="notice notice-error">
          <Icon name="info" size={21} />
          {error}
        </div>
      )}
      {storageError && (
        <div role="alert" className="notice notice-info">
          <Icon name="info" size={21} />
          {storageError}
        </div>
      )}
      <div
        className="study-panel"
        role="tabpanel"
        id={`student-panel-${tab}`}
        aria-labelledby={`student-tab-${tab}`}
      >
        <Suspense
          fallback={
            <div role="status" className="loading-state">
              <span className="loading-dot" />
              Đang tải nội dung…
            </div>
          }
        >
          {tab === 'topics' && (
            <Topics
              storageKey={`deltascript_topics:kntt9:${user.studentName}:${user.studentClass}`}
            />
          )}
          {tab === 'practice' && (
            <>
              <div className="section-heading">
                <div>
                  <span className="section-kicker">GIỎI HƠN TỪNG CÂU MỘT</span>
                  <h2>Luyện tập theo dạng câu</h2>
                  <p className="muted">
                    Chọn một dạng, tự tìm lời giải rồi đối chiếu. Không cần vội.
                  </p>
                </div>
                <span className="soft-badge tone-red">
                  <Icon name="practice" size={18} /> 7 dạng câu hỏi
                </span>
              </div>
              <section className="question-picker surface" aria-label="Chọn câu hỏi để ôn tập">
                <div className="question-choices">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      aria-label={`Câu ${n}`}
                      aria-pressed={selectedNumber === n}
                      className={`question-choice ${selectedNumber === n ? 'active' : ''}`}
                      disabled={busy}
                      onClick={() => practice(n)}
                    >
                      <span>{String(n).padStart(2, '0')}</span>
                      <strong>Câu {n}</strong>
                      <Icon name="arrow" size={18} />
                    </button>
                  ))}
                </div>
              </section>
              {busy ? (
                <div role="status" className="surface loading-state question-loading">
                  <span className="loading-dot" />
                  Đang chuẩn bị câu hỏi cho bạn…
                </div>
              ) : question ? (
                <article className="surface exercise-card">
                  <div className="exercise-heading">
                    <span className="exercise-label">
                      <span className="icon-tile tone-red">
                        <Icon name="practice" size={24} />
                      </span>
                      <span>
                        <small>CÙNG THỬ SỨC NHÉ</small>
                        <h2>{question.label}</h2>
                      </span>
                    </span>
                    <button className="btn btn-quiet" onClick={() => practice(question.number)}>
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
                      aria-controls="practice-solution"
                      onClick={() => setSolution((v) => !v)}
                    >
                      <Icon name="eye" size={20} />
                      {solution ? 'Ẩn lời giải' : 'Xem lời giải'}
                    </button>
                    <button className={button} disabled={busy} onClick={similar}>
                      <Icon name="spark" size={19} />
                      Bài tập tương tự
                    </button>
                    <button className="text-button" onClick={() => openAssistant(question)}>
                      <Icon name="spark" size={19} />
                      Hỏi AI về câu này
                    </button>
                  </div>
                  {solution && (
                    <section id="practice-solution" className="solution-panel">
                      <h3>
                        <Icon name="check" size={22} />
                        Lời giải chi tiết
                      </h3>
                      <LatexContent
                        preamble={question.latexPreamble}
                        context={question.statementRaw}
                        html={question.solutionRaw || 'Chưa có lời giải.'}
                      />
                    </section>
                  )}
                </article>
              ) : (
                !error && (
                  <div className="surface empty-state practice-empty">
                    <div className="empty-illustration">
                      <Icon name="practice" size={64} />
                      <i />
                      <i />
                    </div>
                    <h3>Một câu hỏi, thêm một cơ hội hiểu bài.</h3>
                    <p>
                      Chọn Câu 1 đến Câu 7 phía trên để bắt đầu.
                      <br />
                      Bút, giấy và một chút tò mò là đủ.
                    </p>
                  </div>
                )
              )}
              <div className="study-tip">
                <span className="icon-tile tone-yellow">
                  <Icon name="guide" size={24} />
                </span>
                <p>
                  <strong>Thử trước, xem lời giải sau.</strong> Dành vài phút tự suy nghĩ sẽ giúp
                  bạn nhớ cách giải lâu hơn.
                </p>
              </div>
            </>
          )}
          {tab === 'exam' && (
            <>
              <div className="section-heading">
                <div>
                  <span className="section-kicker">LÀM QUEN TRƯỚC NGÀY THI</span>
                  <h2>Đề thi tham khảo</h2>
                  <p className="muted">
                    Một không gian tập trung để thử sức và nhìn lại kiến thức.
                  </p>
                </div>
                <span className="soft-badge tone-yellow">
                  <Icon name="clock" size={18} />
                  120 phút
                </span>
              </div>
              <section className="exam-create-card">
                <div className="exam-cover">
                  <span>
                    DELTA
                    <br />
                    SCRIPT
                  </span>
                  <Icon name="exam" size={86} />
                  <strong>TOÁN 9</strong>
                  <small>TỰ TIN CHO BƯỚC TIẾP THEO</small>
                </div>
                <div className="exam-create-copy">
                  <span className="eyebrow">MỖI ĐỀ, MỘT LẦN TIẾN BỘ</span>
                  <h3>Sẵn sàng thử sức?</h3>
                  <p>
                    7 câu hỏi, 7 dạng bài. Tạo một đề mới từ kho câu hỏi của giáo viên và bắt đầu
                    khi bạn sẵn sàng.
                  </p>
                  <div className="exam-specs">
                    <span>
                      <Icon name="exam" size={19} />7 câu hỏi
                    </span>
                    <span>
                      <Icon name="clock" size={19} />
                      120 phút
                    </span>
                    <span>
                      <Icon name="guide" size={19} />
                      Có lời giải đối chiếu
                    </span>
                  </div>
                  <button className="btn btn-primary" disabled={busy} onClick={generate}>
                    {busy ? 'Đang tạo đề…' : 'Tạo đề tham khảo'}
                    <Icon name="arrow" size={21} />
                  </button>
                  {exam && (
                    <span className="exam-existing">
                      Bạn đã có một đề {exam.endAt ? 'đang làm' : 'sẵn sàng'} bên dưới.
                    </span>
                  )}
                </div>
              </section>
              {exam && (
                <section className="exam-workspace">
                  <div className="exam-toolbar surface">
                    <span className="exam-clock">
                      <Icon name="clock" size={24} />
                      <span>
                        <small>{exam.endAt ? 'THỜI GIAN CÒN LẠI' : 'THỜI GIAN LÀM BÀI'}</small>
                        <ExamTimer endAt={exam.endAt} />
                      </span>
                    </span>
                    {exam.endAt === null ? (
                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          setExam((v) => v && { ...v, endAt: Date.now() + EXAM_DURATION })
                        }
                      >
                        Bắt đầu làm bài
                        <Icon name="arrow" size={20} />
                      </button>
                    ) : (
                      <button
                        className={button}
                        onClick={() => setExam((v) => v && { ...v, showAnswers: !v.showAnswers })}
                      >
                        <Icon name="eye" size={19} />
                        {exam.showAnswers ? 'Ẩn tất cả đáp án' : 'Hiện tất cả đáp án'}
                      </button>
                    )}
                  </div>
                  {exam.endAt !== null ? (
                    exam.questions.map((q, index) => (
                      <article key={q.id} className="surface exercise-card exam-question">
                        <div className="exercise-heading">
                          <h3>
                            <span className="quiz-number">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            {q.label}
                          </h3>
                          <span className="small-label">DẠNG {q.number}</span>
                        </div>
                        <div className="exercise-body">
                          <LatexContent html={q.statementRaw} preamble={q.latexPreamble} />
                        </div>
                        <button className="text-button" onClick={() => openAssistant(q)}>
                          <Icon name="spark" size={19} />
                          Hỏi AI về câu này
                        </button>
                        {exam.showAnswers && (
                          <section className="solution-panel">
                            <h4>Lời giải</h4>
                            <LatexContent
                              preamble={q.latexPreamble}
                              context={q.statementRaw}
                              html={q.solutionRaw || 'Chưa có lời giải.'}
                            />
                          </section>
                        )}
                      </article>
                    ))
                  ) : (
                    <div className="exam-ready">
                      <span className="icon-tile tone-blue">
                        <Icon name="check" size={32} />
                      </span>
                      <div>
                        <h3>Đề thi của bạn đã sẵn sàng.</h3>
                        <p>
                          Bấm “Bắt đầu làm bài” để mở đề và chạy đồng hồ. Hãy chuẩn bị giấy nháp và
                          chọn một góc yên tĩnh nhé.
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="topics-footnote">
                    <Icon name="info" size={17} />
                    Đề và thời gian kết thúc được giữ khi tải lại trang trong cùng tab.
                  </p>
                </section>
              )}
            </>
          )}
          {tab === 'guide' && (
            <div>
              <div className="section-heading">
                <div>
                  <span className="section-kicker">HỌC NHẸ NHÀNG, NHỚ LÂU HƠN</span>
                  <h2>Một góc nhỏ cho cách học hay</h2>
                  <p className="muted">Bạn không cần giỏi ngay. Chỉ cần bắt đầu và tiếp tục.</p>
                </div>
              </div>
              <div className="guide-grid">
                {[
                  {
                    icon: 'topics' as const,
                    color: 'blue',
                    title: 'Hiểu trước khi nhớ',
                    text: 'Đọc kiến thức cốt lõi, tự làm lại ví dụ rồi thử câu tự kiểm tra. Sai cũng là một phần của việc học.',
                    action: 'Mở chuyên đề',
                    tab: 'topics' as const,
                  },
                  {
                    icon: 'practice' as const,
                    color: 'red',
                    title: 'Tự giải, rồi đối chiếu',
                    text: 'Chọn dạng câu, ghi hướng giải ra giấy. Mở lời giải khi đã thử và tìm xem mình vướng ở bước nào.',
                    action: 'Luyện ngay',
                    tab: 'practice' as const,
                  },
                  {
                    icon: 'exam' as const,
                    color: 'yellow',
                    title: 'Tập trung như đang thi',
                    text: 'Chuẩn bị giấy nháp, đặt điện thoại sang một bên và thử một đề 120 phút. Sau đó dành thời gian chữa bài.',
                    action: 'Tới trang tạo đề',
                    tab: 'exam' as const,
                  },
                ].map((item) => (
                  <section key={item.title} className="surface guide-card">
                    <span className={`icon-tile tone-${item.color}`}>
                      <Icon name={item.icon} size={36} />
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <button className="text-button" onClick={() => changeTab(item.tab)}>
                      {item.action}
                      <Icon name="arrow" size={19} />
                    </button>
                  </section>
                ))}
              </div>
              <section className="surface faq-section">
                <h3>Bạn có thể đang thắc mắc…</h3>
                <details>
                  <summary>Mã ôn tập lấy ở đâu?</summary>
                  <p>
                    Mã gồm 8 chữ hoặc số, do giáo viên cung cấp. Nếu mã không còn hoạt động, bạn hãy
                    liên hệ giáo viên để được cấp mã mới.
                  </p>
                </details>
                <details>
                  <summary>Hỏi trợ lý AI như thế nào cho hiệu quả?</summary>
                  <p>
                    Mở một câu hỏi, chọn “Hỏi AI về câu này”, rồi hỏi cụ thể điều bạn chưa hiểu. Bạn
                    có thể hỏi tiếp trong cùng cuộc trò chuyện. Hãy đối chiếu câu trả lời với kiến
                    thức và lời giải của giáo viên.
                  </p>
                </details>
                <details>
                  <summary>Tiến độ và bài đang làm có được lưu lại không?</summary>
                  <p>
                    Tiến độ chuyên đề được lưu trên trình duyệt đang dùng. Đề thi và đồng hồ được
                    giữ trong tab hiện tại khi tải lại. Xóa dữ liệu trình duyệt có thể làm mất những
                    phần lưu này.
                  </p>
                </details>
              </section>
            </div>
          )}
        </Suspense>
      </div>
      <footer className="study-footer">
        <BrandFooter />
        <span>Đi một chút mỗi ngày, bạn sẽ đi rất xa.</span>
      </footer>
      <button className="assistant-launcher" onClick={() => openAssistant()}>
        <Icon name="spark" size={24} />
        <span>Mở trợ lý AI</span>
        <i />
      </button>
      {aiLoaded && (
        <dialog
          ref={assistantDialog}
          onCancel={() => setMobileAI(false)}
          className="assistant-dialog"
          aria-labelledby="assistant-title"
        >
          <div className="assistant-dialog-heading">
            <span className="icon-tile tone-blue">
              <Icon name="spark" size={26} />
            </span>
            <div>
              <h2 id="assistant-title">Trợ lý Toán học</h2>
              <p>Cùng nghĩ, cùng hiểu bài.</p>
            </div>
            <button
              className="icon-button"
              onClick={() => setMobileAI(false)}
              aria-label="Đóng trợ lý AI"
            >
              <Icon name="close" size={22} />
            </button>
          </div>
          <Suspense fallback={<p className="loading-state">Đang tải trợ lý…</p>}>
            <AIAssistantPanel
              key={aiQuestion?.id || 'general'}
              currentQuestionRaw={aiQuestion?.statementRaw}
            />
          </Suspense>
        </dialog>
      )}
    </div>
  );
}
function BrandFooter() {
  return (
    <span className="footer-wordmark">
      Delta<span>Script</span>
      <i>✦</i>
    </span>
  );
}
