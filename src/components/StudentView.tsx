import React, { useState, useEffect } from 'react';
import { User, Question } from '../types';
import LatexContent from './LatexContent';
import AIAssistantPanel from './AIAssistantPanel';
import { BookOpen, FileText, HelpCircle, RefreshCw, Eye, EyeOff, Play, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { googleSheetsService } from '../services/googleSheetsService';
import { processContentForDisplay } from '../utils/displayContent';

interface StudentViewProps {
  user: User;
  questionBank: Question[];
}

const StudentView: React.FC<StudentViewProps> = ({ user, questionBank }) => {
  const [activeTab, setActiveTab] = useState<'practice' | 'exam' | 'guide'>('practice');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  
  const [renderedStatement, setRenderedStatement] = useState<string>('');
  const [renderedSolution, setRenderedSolution] = useState<string>('');
  const [isRenderingQuestion, setIsRenderingQuestion] = useState(false);

  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [renderedExamStatements, setRenderedExamStatements] = useState<Record<number, string>>({});
  const [renderedExamSolutions, setRenderedExamSolutions] = useState<Record<number, string>>({});
  const [examStarted, setExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [showExamAnswers, setShowExamAnswers] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (examStarted && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [examStarted, timeLeft]);

  const handlePracticeQuestion = async (number: number) => {
    setIsLoading(true);
    setIsRenderingQuestion(true);
    try {
      const questions = await googleSheetsService.getQuestionsByNumber(number);
      console.log("Questions fetched for number", number, ":", questions);
      if (questions && questions.length > 0) {
        const q = questions[Math.floor(Math.random() * questions.length)];
        console.log("Selected question:", q);
        console.log("Selected question raw length:", q?.statementRaw?.length);
        console.log("Selected question raw:", q?.statementRaw);
        setSelectedQuestion(q);
        setShowSolution(false);
        
        const statementHtml = await processContentForDisplay(q.statementRaw || q.raw || "");
        setRenderedStatement(statementHtml);
        
        if (q.solutionRaw) {
          const solutionHtml = await processContentForDisplay(q.solutionRaw);
          setRenderedSolution(solutionHtml);
        } else {
          setRenderedSolution("Chưa có lời giải cho câu hỏi này.");
        }
      } else {
        setSelectedQuestion(null);
        setRenderedStatement('');
        setRenderedSolution('');
        alert(`Không tìm thấy câu hỏi nào cho Câu ${number}`);
      }
    } catch (error) {
      console.error("Error fetching practice question:", error);
      alert("Có lỗi xảy ra khi tải câu hỏi. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
      setIsRenderingQuestion(false);
    }
  };

  const generateExam = async () => {
    setIsLoading(true);
    try {
      const newExam: Question[] = [];
      const statements: Record<number, string> = {};
      const solutions: Record<number, string> = {};
      
      for (let i = 1; i <= 7; i++) {
        const questions = await googleSheetsService.getQuestionsByNumber(i);
        if (questions && questions.length > 0) {
          const q = questions[Math.floor(Math.random() * questions.length)];
          newExam.push(q);
          
          statements[i - 1] = await processContentForDisplay(q.statementRaw || q.raw || "");
          solutions[i - 1] = await processContentForDisplay(q.solutionRaw || "Chưa có lời giải.");
        }
      }
      console.log("examQuestions before start:", newExam);
      setExamQuestions(newExam);
      setRenderedExamStatements(statements);
      setRenderedExamSolutions(solutions);
      setExamStarted(false);
      setTimeLeft(120 * 60);
      setShowExamAnswers(false);
    } catch (error) {
      console.error("Error generating exam:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExam = () => {
    console.log("examQuestions after start:", examQuestions);
    setExamStarted(true);
  };

  const handleToggleAnswers = () => {
    console.log("showAllAnswers toggled:", !showExamAnswers);
    setShowExamAnswers(!showExamAnswers);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Không gian học tập của Học sinh!</h1>
          <p className="text-lg text-indigo-600 font-medium">Xin chào, {user.studentName} - Lớp {user.studentClass}</p>
        </div>

        <div className="flex border-b border-gray-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-2 px-4 py-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'practice' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpen size={18} />
            Ôn tập theo câu
          </button>
          <button
            onClick={() => setActiveTab('exam')}
            className={`flex items-center gap-2 px-4 py-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'exam' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText size={18} />
            Đề thi tham khảo
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'guide' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <HelpCircle size={18} />
            Hướng dẫn
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'practice' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Chọn câu hỏi để ôn tập</h3>
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <button
                      key={num}
                      onClick={() => handlePracticeQuestion(num)}
                      disabled={isLoading || isRenderingQuestion}
                      className={`px-6 py-3 font-medium rounded-xl border transition-all shadow-sm ${
                        (isLoading || isRenderingQuestion)
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
                      }`}
                    >
                      Câu {num}
                    </button>
                  ))}
                </div>
              </div>

              {(isLoading || isRenderingQuestion) ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-indigo-600">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">Đang tải và xử lý câu hỏi...</p>
                </div>
              ) : selectedQuestion ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">{selectedQuestion.label}</h3>
                    <button
                      onClick={() => handlePracticeQuestion(selectedQuestion.number || 1)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <RefreshCw size={16} />
                      Lấy câu hỏi khác
                    </button>
                  </div>
                  
                  <div className="prose max-w-none mb-8">
                    <LatexContent html={renderedStatement} />
                  </div>
                  
                  <div className="border-t border-gray-100 pt-6">
                    <button
                      onClick={() => setShowSolution(!showSolution)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm shadow-indigo-200"
                    >
                      {showSolution ? <EyeOff size={18} /> : <Eye size={18} />}
                      {showSolution ? "Ẩn lời giải" : "Xem lời giải"}
                    </button>
                    
                    {showSolution && (
                      <div className="mt-6 p-6 bg-green-50/50 border border-green-100 rounded-xl">
                        <h4 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                          <CheckCircle2 size={18} />
                          Lời giải chi tiết
                        </h4>
                        <LatexContent html={renderedSolution} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
                  Hãy chọn một câu ở trên để bắt đầu ôn tập.
                </div>
              )}
            </div>
          )}

          {activeTab === 'exam' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Đề thi tham khảo</h3>
                  <p className="text-sm text-gray-500 mt-1">Hệ thống sẽ tạo ngẫu nhiên một đề thi gồm 7 câu.</p>
                </div>
                <button
                  onClick={generateExam}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl transition-colors font-medium shadow-sm ${
                    isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  {isLoading ? 'Đang tạo đề...' : 'Tạo đề tham khảo'}
                </button>
              </div>

              {isLoading ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-indigo-600">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">Đang tải và xử lý đề thi...</p>
                </div>
              ) : examQuestions.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  {!examStarted ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full mb-4">
                        <Clock size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Đề thi đã sẵn sàng</h3>
                      <p className="text-gray-600 mb-8">Thời gian làm bài: 120 phút. Chúc bạn làm bài tốt!</p>
                      <button
                        onClick={handleStartExam}
                        className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-lg shadow-md shadow-green-200"
                      >
                        <Play size={20} />
                        Bắt đầu làm bài
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-4 mb-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3 text-2xl font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                          <Clock size={24} />
                          {formatTime(timeLeft)}
                        </div>
                        <button
                          onClick={handleToggleAnswers}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors font-medium shadow-sm"
                        >
                          {showExamAnswers ? <EyeOff size={18} /> : <Eye size={18} />}
                          {showExamAnswers ? "Ẩn tất cả đáp án" : "Hiện tất cả đáp án"}
                        </button>
                      </div>

                      <div className="space-y-12">
                        {examQuestions.map((q, idx) => {
                          return (
                          <div key={idx} className="pb-8 border-b border-gray-100 last:border-0">
                            <h4 className="text-lg font-bold text-gray-900 mb-4">{q.label}</h4>
                            <div className="prose max-w-none mb-6">
                              <LatexContent html={renderedExamStatements[idx] || "Đang tải..."} />
                            </div>
                            
                            {showExamAnswers && (
                              <div className="mt-4 p-6 bg-green-50/50 border border-green-100 rounded-xl">
                                <h5 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                                  <CheckCircle2 size={18} />
                                  Lời giải
                                </h5>
                                <LatexContent html={renderedExamSolutions[idx] || "Chưa có lời giải."} />
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <HelpCircle className="text-indigo-600" />
                Hướng dẫn sử dụng
              </h3>
              <div className="space-y-6 text-gray-600 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg mb-2">1. Ôn tập theo câu</h4>
                  <p>Chọn từng câu từ 1 đến 7 để ôn tập. Hệ thống sẽ lấy ngẫu nhiên một bài toán trong ngân hàng câu hỏi tương ứng với dạng bài đó. Bạn có thể xem đề bài, tự giải, và sau đó bấm "Xem lời giải" để đối chiếu kết quả.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg mb-2">2. Đề thi tham khảo</h4>
                  <p>Bấm "Tạo đề tham khảo" để hệ thống tự động sinh ra một đề thi hoàn chỉnh gồm 7 câu. Khi bạn bấm "Bắt đầu làm bài", đồng hồ đếm ngược 120 phút sẽ chạy. Sau khi làm xong, bạn có thể xem đáp án của toàn bộ đề thi.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg mb-2">3. Trợ lý AI DeltaScript</h4>
                  <p>Bên phải màn hình là Trợ lý AI. Nếu gặp khó khăn, bạn có thể hỏi AI để xin gợi ý. Lưu ý: AI chỉ đưa ra gợi ý từng bước, nhắc lại kiến thức, hoặc kiểm tra hướng làm của bạn, chứ không giải sẵn toàn bộ bài toán.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="w-96 hidden lg:block flex-shrink-0">
        <AIAssistantPanel currentQuestionRaw={selectedQuestion?.statementRaw} />
      </div>
    </div>
  );
};

export default StudentView;
