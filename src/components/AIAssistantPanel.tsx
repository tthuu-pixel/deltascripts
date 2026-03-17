import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Lightbulb, BookOpen, CheckCircle } from 'lucide-react';
import { ChatMessage } from '../types';
import { getAIResponse } from '../services/aiService';
import LatexContent from './LatexContent';

interface AIAssistantPanelProps {
  currentQuestionRaw?: string;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ currentQuestionRaw }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Chào bạn! Mình là Trợ lý AI DeltaScript. Mình có thể giúp gì cho bạn với bài toán này?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: 'Vui lòng nhập Gemini API Key trong phần Cài đặt để sử dụng tính năng này.' }]);
      setInput('');
      return;
    }

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      let prompt = text;
      if (currentQuestionRaw) {
        prompt = `Câu hỏi hiện tại: ${currentQuestionRaw}\n\nYêu cầu của học sinh: ${text}`;
      }

      const response = await getAIResponse(prompt, apiKey);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Lỗi: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Gợi ý bước 1', icon: <Lightbulb size={16} />, text: 'Hãy gợi ý cho mình bước đầu tiên để giải bài toán này.' },
    { label: 'Gợi ý tiếp theo', icon: <Lightbulb size={16} />, text: 'Mình đã làm được một phần, hãy gợi ý bước tiếp theo.' },
    { label: 'Nhắc kiến thức', icon: <BookOpen size={16} />, text: 'Bài toán này cần áp dụng những kiến thức nào?' },
    { label: 'Kiểm tra hướng làm', icon: <CheckCircle size={16} />, text: 'Mình định làm theo hướng này, bạn kiểm tra giúp mình xem có đúng không?' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-indigo-50 flex items-center gap-2">
        <Bot className="text-indigo-600" />
        <h2 className="font-semibold text-indigo-900">Trợ lý AI DeltaScript</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-sm' 
                : 'bg-gray-100 text-gray-800 rounded-tl-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <LatexContent html={msg.content} />
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3 flex items-center gap-2 text-gray-500">
              <Loader2 className="animate-spin" size={16} />
              <span>Đang suy nghĩ...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(action.text)}
              disabled={isLoading}
              className="flex items-center gap-1 text-xs bg-white border border-gray-300 hover:border-indigo-400 hover:text-indigo-600 px-2 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Nhập câu hỏi..."
            disabled={isLoading}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPanel;
