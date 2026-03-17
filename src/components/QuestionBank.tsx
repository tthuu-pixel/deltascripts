import React, { useState, useRef, useEffect } from 'react';
import { Question, AccessCode } from '../types';
import { parseWordFile } from '../parsers/wordParser';
import { parseTexFile } from '../parsers/texParser';
import LatexContent from './LatexContent';
import { Upload, Trash2, CheckSquare, Square, Eye, FileText, FileCode2, Loader2, AlertCircle, X, KeyRound, PlusCircle, List, UserCog, School, Phone, BadgeInfo, Save, RefreshCw } from 'lucide-react';
import { googleSheetsService } from '../services/googleSheetsService';

interface QuestionBankProps {
  questionBank: Question[];
  setQuestionBank: React.Dispatch<React.SetStateAction<Question[]>>;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ questionBank, setQuestionBank }) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'codes' | 'info'>('questions');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
  const [viewingType, setViewingType] = useState<'statement' | 'solution'>('statement');
  
  // Access Code State
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [newCode, setNewCode] = useState('');
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);

  const [pendingUploadQuestions, setPendingUploadQuestions] = useState<Question[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'codes') {
      loadAccessCodes();
    } else if (activeTab === 'questions') {
      loadQuestions();
    }
  }, [activeTab]);

  useEffect(() => {
    loadAccessCodes();
  }, []);

  const loadQuestions = async () => {
    setIsProcessing(true);
    try {
      const questions = await googleSheetsService.getAllQuestions();
      setQuestionBank(questions);
      localStorage.setItem('deltascript_question_bank', JSON.stringify(questions));
    } catch (err) {
      console.error("Error fetching questions from cloud:", err);
      setError("Không thể tải dữ liệu từ Cloud.");
    } finally {
      setIsProcessing(false);
    }
  };

  const loadAccessCodes = async () => {
    setIsLoadingCodes(true);
    try {
      const res = await googleSheetsService.getAccessCodes();
      if (res.success) {
        setAccessCodes(res.items || []);
      }
    } catch (err) {
      console.error("Error fetching codes:", err);
    } finally {
      setIsLoadingCodes(false);
    }
  };

  const handleCreateCode = async () => {
    const code = newCode.trim() || Math.random().toString(36).substring(2, 10).toUpperCase();
    setIsLoadingCodes(true);
    try {
      const success = await googleSheetsService.createAccessCode(code);
      if (success) {
        // Optimistically add to state
        setAccessCodes(prev => [{
          code,
          createdAt: new Date().toISOString(),
          active: true
        }, ...prev]);
        setNewCode('');
        // Wait a bit for Google Sheets to process before reloading
        setTimeout(() => {
          loadAccessCodes();
        }, 2000);
      }
    } catch (err) {
      console.error("Error creating code:", err);
    } finally {
      setIsLoadingCodes(false);
    }
  };

  const handleDeleteCode = async (code: string) => {
    if (!confirm(`Bạn có chắc muốn xóa mã ${code}?`)) return;
    setIsLoadingCodes(true);
    try {
      const success = await googleSheetsService.deleteAccessCode(code);
      if (success) {
        await loadAccessCodes();
        const newSelected = new Set(selectedCodes);
        newSelected.delete(code);
        setSelectedCodes(newSelected);
      }
    } catch (err) {
      console.error("Error deleting code:", err);
    } finally {
      setIsLoadingCodes(false);
    }
  };

  const toggleSelectCode = (code: string) => {
    const newSelected = new Set(selectedCodes);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedCodes(newSelected);
  };

  const selectAllCodes = () => {
    if (!Array.isArray(accessCodes)) return;
    setSelectedCodes(new Set(accessCodes.map(ac => ac.code)));
  };

  const deselectAllCodes = () => {
    setSelectedCodes(new Set());
  };

  const deleteSelectedCodes = async () => {
    if (selectedCodes.size === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedCodes.size} mã đã chọn?`)) return;

    setIsLoadingCodes(true);
    try {
      const codesToDelete = Array.from(selectedCodes) as string[];
      const success = await googleSheetsService.deleteAccessCodes(codesToDelete);
      if (success) {
        await loadAccessCodes();
        setSelectedCodes(new Set());
      }
    } catch (err) {
      console.error("Error deleting selected codes:", err);
    } finally {
      setIsLoadingCodes(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setUploadStatus('Đang đọc file...');
    setPendingUploadQuestions([]);

    try {
      let allNewQuestions: Question[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let newQuestions: Question[] = [];
        if (file.name.endsWith('.docx')) {
          newQuestions = await parseWordFile(file);
        } else if (file.name.endsWith('.tex')) {
          newQuestions = await parseTexFile(file);
        }
        allNewQuestions = [...allNewQuestions, ...newQuestions];
      }

      if (allNewQuestions.length === 0) {
        throw new Error('Không tìm thấy câu hỏi nào trong các file đã chọn.');
      }

      setPendingUploadQuestions(allNewQuestions);
      setUploadStatus(`Đã đọc được ${allNewQuestions.length} câu`);
      
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || 'Có lỗi xảy ra khi đọc file.');
      setUploadStatus('');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveToCloud = async () => {
    if (pendingUploadQuestions.length === 0) return;
    
    setIsProcessing(true);
    setUploadStatus('Đang gửi lên cloud...');
    try {
      const success = await googleSheetsService.saveQuestions(pendingUploadQuestions);
      if (success) {
        setUploadStatus(`Đã lưu ${pendingUploadQuestions.length} câu lên hệ thống`);
        setPendingUploadQuestions([]);
        await loadQuestions();
      } else {
        setError('Có lỗi xảy ra khi lưu lên cloud.');
        setUploadStatus('');
      }
    } catch (err) {
      console.error("Error saving to cloud:", err);
      setError('Có lỗi xảy ra khi lưu lên cloud.');
      setUploadStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(questionBank.map(q => q.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const idsToDelete = Array.from(selectedIds) as string[];
    setIsProcessing(true);
    try {
      // Delete from cloud
      const success = await googleSheetsService.deleteQuestions(idsToDelete);
      
      if (success) {
        // Update local state
        const updatedBank = questionBank.filter(q => !selectedIds.has(q.id));
        setQuestionBank(updatedBank);
        localStorage.setItem('deltascript_question_bank', JSON.stringify(updatedBank));
        setSelectedIds(new Set());
        await loadQuestions();
      } else {
        setError('Có lỗi xảy ra khi xóa câu hỏi trên Cloud.');
      }
    } catch (err) {
      console.error("Error deleting questions:", err);
      setError("Có lỗi xảy ra khi xóa câu hỏi.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Khu vực Giáo viên</h1>
            <p className="text-gray-500 text-sm">Quản lý ngân hàng câu hỏi và mã truy cập hệ thống</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'questions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={18} />
              Ngân hàng câu hỏi
            </button>
            <button
              onClick={() => setActiveTab('codes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'codes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <KeyRound size={18} />
              Quản lý mã ôn tập
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'info' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BadgeInfo size={18} />
              Thông tin hệ thống
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {activeTab === 'questions' && (
            <>
              {/* Upload Section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">Thêm câu hỏi mới</h3>
                    <p className="text-sm text-gray-500">Hỗ trợ file Word (.docx) và LaTeX (.tex)</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {uploadStatus && (
                      <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        {uploadStatus}
                      </span>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".docx,.tex"
                      multiple
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm shadow-indigo-200 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                      {isProcessing ? 'Đang xử lý...' : 'Tải lên file'}
                    </button>
                    {pendingUploadQuestions.length > 0 && (
                      <button
                        onClick={handleSaveToCloud}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm shadow-emerald-200 disabled:opacity-50"
                      >
                        <Save size={18} />
                        Lưu lên Cloud
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="font-medium">Lỗi import file</h4>
                      <p className="text-sm mt-1 opacity-90">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Bar removed as requested */}

              {/* Question List */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {questionBank.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
                      <FileText size={32} className="text-gray-400" />
                    </div>
                    <p>Ngân hàng câu hỏi đang trống.</p>
                    <p className="text-sm mt-1">Hãy tải lên file Word hoặc TeX để bắt đầu.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {questionBank.map((q, index) => (
                      <div key={q.id} className={`p-4 flex items-start gap-4 transition-colors ${selectedIds.has(q.id) ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(q.id)}
                            onChange={() => toggleSelect(q.id)}
                            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-900">{q.label}</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                              q.sourceType === 'word' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {q.sourceType === 'word' ? <FileText size={12} /> : <FileCode2 size={12} />}
                              {q.sourceType === 'word' ? 'Word' : 'TeX'}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 line-clamp-2 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            {q.statementRaw ? q.statementRaw.replace(/<[^>]*>?/gm, '').substring(0, 150) : ''}...
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setViewingQuestion(q); setViewingType('statement'); }}
                              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Eye size={14} />
                              Xem đề bài
                            </button>
                            <button
                              onClick={() => { setViewingQuestion(q); setViewingType('solution'); }}
                              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Eye size={14} />
                              Xem lời giải
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'codes' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Quản lý mã ôn tập</h3>
                  <p className="text-sm text-gray-500">Tạo và quản lý mã truy cập dành cho học sinh</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="Nhập mã (tùy chọn)"
                    className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-48 font-mono uppercase"
                  />
                  <button
                    onClick={handleCreateCode}
                    disabled={isLoadingCodes}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-md shadow-indigo-200 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isLoadingCodes ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
                    Tạo mã mới
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between text-gray-600 font-medium">
                  <div className="flex items-center gap-2">
                    <List size={18} />
                    Danh sách mã đang hoạt động
                  </div>
                  {Array.isArray(accessCodes) && accessCodes.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={selectedCodes.size === accessCodes.length ? deselectAllCodes : selectAllCodes}
                        className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {selectedCodes.size === accessCodes.length ? (
                          <><Square size={16} /> Bỏ chọn tất cả</>
                        ) : (
                          <><CheckSquare size={16} /> Chọn tất cả</>
                        )}
                      </button>
                      <button
                        onClick={deleteSelectedCodes}
                        disabled={selectedCodes.size === 0 || isLoadingCodes}
                        className="text-sm flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={16} /> Xóa mã đã chọn ({selectedCodes.size})
                      </button>
                    </div>
                  )}
                </div>
                
                {isLoadingCodes && (!Array.isArray(accessCodes) || accessCodes.length === 0) ? (
                  <div className="p-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={32} />
                    <p className="text-gray-500">Đang tải danh sách mã...</p>
                  </div>
                ) : (!Array.isArray(accessCodes) || accessCodes.length === 0) ? (
                  <div className="p-12 text-center text-gray-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
                      <KeyRound size={32} className="text-gray-400" />
                    </div>
                    <p>Chưa có mã ôn tập nào.</p>
                    <p className="text-sm mt-1">Bấm "Tạo mã mới" để bắt đầu.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                          <th className="p-4 font-medium w-12 text-center">
                            <button
                              onClick={selectedCodes.size === accessCodes.length ? deselectAllCodes : selectAllCodes}
                              className="text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              {selectedCodes.size === accessCodes.length && accessCodes.length > 0 ? (
                                <CheckSquare size={18} />
                              ) : (
                                <Square size={18} className="text-gray-300" />
                              )}
                            </button>
                          </th>
                          <th className="p-4 font-medium">Mã truy cập</th>
                          <th className="p-4 font-medium">Ngày tạo</th>
                          <th className="p-4 font-medium">Trạng thái</th>
                          <th className="p-4 font-medium text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {accessCodes.map((ac) => (
                          <tr key={ac.code} className="hover:bg-gray-50 transition-colors group">
                            <td className="p-4 text-center">
                              <button
                                onClick={() => toggleSelectCode(ac.code)}
                                className="text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                {selectedCodes.has(ac.code) ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300" />}
                              </button>
                            </td>
                            <td className="p-4">
                              <span className="font-mono font-bold text-indigo-700 tracking-wider text-lg">{ac.code}</span>
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {ac.createdAt || '-'}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                ac.active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${ac.active !== false ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                {ac.active !== false ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteCode(ac.code)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 inline-flex"
                                title="Xóa mã"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl">
                  <BadgeInfo size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Thông tin hệ thống</h2>
                  <p className="text-gray-500">DeltaScript - Hỗ trợ học tập Toán 9</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-600">
                    <UserCog size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Phát triển hệ thống</h4>
                    <p className="text-lg font-bold text-gray-900">Thầy Trương Trọng Hữu – Giáo viên Toán</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-600">
                    <School size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Đơn vị công tác</h4>
                    <p className="text-lg font-bold text-gray-900">Trường THCS Nguyễn Tri Phương – Phường Diên Hồng (Quận 10)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-600">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Liên hệ</h4>
                    <p className="text-lg font-bold text-gray-900">0906.773.516</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-400">© 2026 DeltaScript. Phiên bản 2.0 - Tích hợp Google Sheets Cloud.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {viewingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {viewingQuestion.label}
                <span className="text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {viewingType === 'statement' ? 'Đề bài' : 'Lời giải'}
                </span>
              </h2>
              <button 
                onClick={() => setViewingQuestion(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                <LatexContent html={viewingType === 'statement' ? viewingQuestion.statementRaw : (viewingQuestion.solutionRaw || 'Chưa có lời giải.')} />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setViewingType(viewingType === 'statement' ? 'solution' : 'statement')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Chuyển sang {viewingType === 'statement' ? 'Lời giải' : 'Đề bài'}
              </button>
              <button
                onClick={() => setViewingQuestion(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
