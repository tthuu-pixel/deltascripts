import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './components/Login';
import StudentView from './components/StudentView';
import QuestionBank from './components/QuestionBank';
import SettingsModal from './components/SettingsModal';
import { User, Question } from './types';
import { googleSheetsService } from './services/googleSheetsService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('deltascript_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }

    const storedBank = localStorage.getItem('deltascript_question_bank');
    if (storedBank) {
      try {
        setQuestionBank(JSON.parse(storedBank));
      } catch (e) {
        console.error("Failed to parse question bank from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'student') {
      fetchQuestions();
    }
  }, [user]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const questions = await googleSheetsService.getAllQuestions();
      if (questions.length > 0) {
        setQuestionBank(questions);
        localStorage.setItem('deltascript_question_bank', JSON.stringify(questions));
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('deltascript_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('deltascript_user');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {user && (
        <Header 
          user={user} 
          onLogout={handleLogout} 
          onOpenSettings={() => setIsSettingsOpen(true)} 
        />
      )}
      
      <main className="flex-1 flex flex-col">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : user.role === 'student' ? (
          <StudentView user={user} questionBank={questionBank} />
        ) : (
          <QuestionBank questionBank={questionBank} setQuestionBank={setQuestionBank} />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
