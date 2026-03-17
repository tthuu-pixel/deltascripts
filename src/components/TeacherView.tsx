import React, { useState } from 'react';
import QuestionBank from './QuestionBank';
import { LayoutDashboard, Users, Database } from 'lucide-react';

export function TeacherView() {
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2' | 'bank'>('bank');

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Không gian Giáo viên</h1>
        <p className="text-slate-600 mt-1">Quản lý ngân hàng câu hỏi và theo dõi tiến độ học tập.</p>
      </div>
      
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('tab1')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'tab1' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Tổng quan (Tab 1)
        </button>
        <button
          onClick={() => setActiveTab('tab2')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'tab2' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Học sinh (Tab 2)
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'bank' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          Ngân hàng câu hỏi
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {activeTab === 'tab1' && (
          <div className="text-center py-12 text-slate-500">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Tổng quan</h3>
            <p>Nội dung Tab 1 đang được cập nhật...</p>
          </div>
        )}
        
        {activeTab === 'tab2' && (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Quản lý học sinh</h3>
            <p>Nội dung Tab 2 đang được cập nhật...</p>
          </div>
        )}
        
        {activeTab === 'bank' && (
          <QuestionBank />
        )}
      </div>
    </div>
  );
}
