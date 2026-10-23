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
import {
  defaultStudentSettings,
  type StudentSettings,
  type TopicSummary,
  type StudentTabKey,
} from '../../shared/content';
const Topics = lazy(() => import('./Topics'));
const StudyGuide = lazy(() => import('./StudyGuide'));
const tabDecorations: Record<StudentTabKey, { icon: IconName; color: string }> = {
  topics: { icon: 'topics', color: 'blue' },
  exam: { icon: 'exam', color: 'yellow' },
  guide: { icon: 'guide', color: 'red' },
};
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
  const [tab, setTab] = useState<StudentTabKey>(() => {
    const saved = readStorage<unknown>(tabStorageKey, 'topics', sessionStorage);
    return defaultStudentSettings.tabs.find((item) => item.key === saved)?.key || 'topics';
  });
  useEffect(() => {
    writeStorage(tabStorageKey, tab, sessionStorage);
  }, [tab, tabStorageKey]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [aiQuestion, setAiQuestion] = useState<Question | null>(null),
    [mobileAI, setMobileAI] = useState(false);
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
      if (!validExam(next)) throw new Error('Đề thi chưa đủ 7 câu khác nhau. Vui lòng thử lại.');
      setExam(next);
      setAiQuestion(null);
    } catch (error) {
      if (id === requestId.current) setError((error as Error).message);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  const [contentSettings, setContentSettings] = useState<StudentSettings>(defaultStudentSettings);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [contentLoading, setContentLoading] = useState(true),
    [contentError, setContentError] = useState('');
  const contentRequest = useRef(0);
  const studyTabs = contentSettings.tabs
    .filter((item) => item.visible)
    .map((item) => ({ ...item, ...tabDecorations[item.key] }));
  async function refreshContent() {
    const id = ++contentRequest.current;
    setContentLoading(true);
    setContentError('');
    try {
      const content = await apiService.getStudentContent();
      if (id !== contentRequest.current) return;
      setContentSettings(content.settings);
      setTopics(content.topics);
    } catch (e) {
      if (id === contentRequest.current) setContentError((e as Error).message);
    } finally {
      if (id === contentRequest.current) setContentLoading(false);
    }
  }
  useEffect(() => {
    void refreshContent();
    return () => {
      contentRequest.current++;
    };
  }, []);
  useEffect(() => {
    if (!contentSettings.tabs.some((item) => item.key === tab && item.visible))
      changeTab(contentSettings.tabs.find((item) => item.visible)!.key);
  }, [contentSettings, tab]);
  function changeTab(value: typeof tab) {
    requestId.current++;
    setBusy(false);
    setError('');
    setTab(value);
    setMobileAI(false);
    setAiQuestion(null);
  }
  return (
    <div className="study-page page-width">
      <section className="study-hero">
        <div className="study-hero-copy">
          <span className="eyebrow">
            XIN CHÀO, {user.studentName?.toUpperCase()} <span className="hello-dot" />
          </span>
          <h1>
            {contentSettings.heroTitle}
            <span>{contentSettings.heroSubtitle}</span>
          </h1>
          <p>{contentSettings.heroIntro}</p>
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
      <div className="student-content-toolbar">
        <button
          className="text-button"
          disabled={contentLoading}
          onClick={() => void refreshContent()}
        >
          <Icon name="refresh" size={18} />
          {contentLoading ? 'Đang tải nội dung…' : 'Cập nhật nội dung'}
        </button>
      </div>
      {contentError && (
        <p className="notice notice-error" role="alert">
          {contentError}
        </p>
      )}
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
          {tab === 'topics' && !contentLoading && !contentError && (
            <Topics topics={topics} intro={contentSettings.topicsIntro} />
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
                    7 câu hỏi từ các chuyên đề do quản trị viên cấu hình. Tạo đề và bắt đầu khi bạn
                    sẵn sàng.
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
                            Câu {index + 1}
                          </h3>
                          {q.examDescription && (
                            <span className="small-label">{q.examDescription}</span>
                          )}
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
            <StudyGuide title={contentSettings.guideTitle} content={contentSettings.guideContent} />
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
