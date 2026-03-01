import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayoutContext } from '../components/LayoutContext';
import { sendChatMessage, type ChatMessage } from '../api/chat';
import type { AuthUser } from '../types/auth';
import { getSession } from '../utils/session';
import { CHAT_MAX_HISTORY_MESSAGES } from '../constants';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { setMenuOpen } = useLayoutContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getSession();
    if (!stored) {
      navigate('/login');
      return;
    }
    const userData = JSON.parse(stored);
    if (!userData.baby_id) {
      navigate('/onboarding');
      return;
    }
    setUser(userData);
  }, [navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user?.baby_id || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      // Get last N messages for context
      const history = [...messages, userMessage].slice(-CHAT_MAX_HISTORY_MESSAGES);
      
      const response = await sendChatMessage({
        baby_id: user.baby_id,
        user_id: user.user_id,
        message: userMessage.content,
        history,
      });

      // Add AI response
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple markdown renderer for AI responses
  const renderMarkdown = (text: string) => {
    // Split into lines for processing
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let key = 0;

    const formatInline = (line: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = [];
      // Match **bold** and *italic* patterns
      const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(line)) !== null) {
        // Text before match
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }
        if (match[1]) {
          // **bold**
          parts.push(<strong key={`b${match.index}`}>{match[1]}</strong>);
        } else if (match[2]) {
          // *italic*
          parts.push(<em key={`i${match.index}`}>{match[2]}</em>);
        }
        lastIndex = regex.lastIndex;
      }
      // Remaining text
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }
      return parts.length > 0 ? parts : [line];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') {
        elements.push(<br key={key++} />);
      } else {
        elements.push(
          <span key={key++}>
            {formatInline(line)}
            {i < lines.length - 1 && lines[i + 1]?.trim() !== '' && <br />}
          </span>
        );
      }
    }
    return elements;
  };

  const babyName = user?.baby?.first_name || 'your baby';

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)]">
      {/* Header Section - fixed at top */}
      <section className="pt-6 px-5 pb-4 relative z-10 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="cursor-pointer rounded-full hover:bg-gray-50 transition-colors"
              onClick={() => setMenuOpen(true)}
            >
              <img
                className="[border:none] p-0 bg-[transparent] w-12 h-[37px] relative"
                alt="Menu"
                src="/hugeicons-menu-02.svg"
              />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold font-[Kodchasan] text-[#000] m-0">
              AI Chat
            </h1>
          </div>

          <img src="/logo.svg" alt="Nappi" className="w-12 h-12" />
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-1">
          Ask me anything about {babyName}&apos;s sleep
        </p>
      </section>

      {/* Chat Messages - scrollable area */}
      <section className="flex-1 px-5 pb-4 overflow-y-auto relative z-10 min-h-0">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto h-full">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Start a conversation
              </h3>
              <p className="text-sm text-gray-500 max-w-[280px] mx-auto">
                Ask questions about {babyName}&apos;s sleep patterns, room conditions, or get personalized advice.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <p className="text-xs text-gray-400">Try asking:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    'Why does my baby wake up at night?',
                    'What\'s the best room temperature?',
                    'How can I improve sleep quality?',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-[#4ECDC4] text-white rounded-br-md'
                    : 'bg-white shadow-sm border border-gray-100 rounded-bl-md'
                }`}
              >
                <div className="m-0 text-sm leading-relaxed">
                  {message.role === 'assistant' ? renderMarkdown(message.content) : message.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* Input Section */}
      <section className="px-5 pb-6 pt-2 relative z-10 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask about ${babyName}'s sleep...`}
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 bg-white text-sm outline-none transition-all duration-200 focus:border-[#4ECDC4] focus:shadow-[0_0_0_3px_rgba(78,205,196,0.2)] resize-none min-h-[48px] max-h-[120px]"
                style={{ lineHeight: '1.5' }}
                disabled={loading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                loading || !input.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#4ECDC4] hover:bg-[#3dbdb5] text-white shadow-md hover:shadow-lg active:scale-95'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            AI responses are based on {babyName}&apos;s sleep data
          </p>
        </div>
      </section>
    </div>
  );
};

export default Chat;
