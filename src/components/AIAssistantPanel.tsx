import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';
import { apiService } from '../services/apiService';
import LatexContent from './LatexContent';
import Icon from './Icons';

export default function AIAssistantPanel({ currentQuestionRaw }: { currentQuestionRaw?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Chào bạn! Mình có thể gợi ý cách giải và nhắc kiến thức Toán 9.',
    },
  ]);
  const [input, setInput] = useState(''),
    [busy, setBusy] = useState(false);
  const active = useRef(true),
    locked = useRef(false),
    end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);
  async function send(value = input) {
    const message = value.trim();
    if (!message || locked.current) return;
    locked.current = true;
    setBusy(true);
    setInput('');
    const history = messages.filter((m) => !m.content.startsWith('Lỗi:')).slice(-12);
    setMessages((items) => [...items, { role: 'user', content: message }]);
    try {
      let key = '';
      try {
        key = sessionStorage.getItem('gemini_api_key') || '';
      } catch {}
      const reply = await apiService.askAI(message, currentQuestionRaw || '', history, key);
      if (active.current) setMessages((items) => [...items, { role: 'assistant', content: reply }]);
    } catch (error) {
      if (active.current)
        setMessages((items) => [
          ...items,
          { role: 'assistant', content: `Lỗi: ${(error as Error).message}` },
        ]);
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <section className="chat-panel" aria-label="Trợ lý AI">
      <div className="chat-context">
        <Icon name="practice" size={16} />
        {currentQuestionRaw
          ? 'Đang cùng bạn tìm hiểu câu hỏi đã chọn'
          : 'Một góc nhỏ để hỏi kiến thức Toán 9'}
      </div>
      <div className="chat-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={`chat-bubble chat-${message.role}`}>
            <LatexContent html={message.content} plainText />
          </div>
        ))}
        {busy && (
          <p role="status" className="muted">
            Đang suy nghĩ…
          </p>
        )}
        <div ref={end} />
      </div>
      <div className="chat-compose">
        <div className="chat-suggestions">
          {['Gợi ý bước đầu tiên', 'Nhắc lại kiến thức cần dùng', 'Gợi ý bước tiếp theo'].map(
            (value) => (
              <button key={value} disabled={busy} onClick={() => send(value)}>
                {value}
              </button>
            ),
          )}
        </div>
        <form
          className="chat-input-row"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            aria-label="Tin nhắn cho trợ lý AI"
            maxLength={5000}
            value={input}
            disabled={busy}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Mình đang vướng ở bước nào?"
          />
          <button aria-label="Gửi" disabled={busy || !input.trim()}>
            <Icon name="send" size={19} />
            Gửi
          </button>
        </form>
        <p className="chat-disclaimer">
          AI có thể nhầm. Hãy đối chiếu với bài học và giáo viên nhé.
        </p>
      </div>
    </section>
  );
}
