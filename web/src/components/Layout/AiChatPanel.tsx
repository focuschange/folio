import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Send, Trash2, FileCode2, Loader2, AlertCircle, Settings } from 'lucide-react';
import type { ChatMessage, AiConfig } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export function AiChatPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const chatMessages = useAppStore(s => s.chatMessages);
  const chatLoading = useAppStore(s => s.chatLoading);
  const addChatMessage = useAppStore(s => s.addChatMessage);
  const clearChatMessages = useAppStore(s => s.clearChatMessages);
  const setChatLoading = useAppStore(s => s.setChatLoading);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const toggleSettings = useAppStore(s => s.toggleSettings);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const [input, setInput] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const inputBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const userBg = theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50';
  const assistantBg = theme === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-50';

  // Load AI config on mount
  useEffect(() => {
    if (!isTauri) return;
    tauriInvoke<string>('load_ai_config')
      .then(json => {
        const config = JSON.parse(json);
        setAiConfig({
          provider: config.provider || 'claude',
          apiKey: config.api_key || '',
          model: config.model || 'claude-sonnet-4-20250514',
        });
      })
      .catch(() => setAiConfig(null));
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || chatLoading) return;

    setError(null);
    setInput('');

    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    addChatMessage(userMsg);

    // Build messages for API
    const allMessages = [...chatMessages, userMsg];
    const apiMessages = allMessages.map(m => ({ role: m.role, content: m.content }));

    // Build context
    const context = includeContext && activeTab
      ? `File: ${activeTab.path}\nLanguage: ${activeTab.language}\n\n${activeTab.content.slice(0, 8000)}`
      : undefined;

    setChatLoading(true);
    try {
      if (!isTauri) {
        // Mock response for web dev mode
        await new Promise(r => setTimeout(r, 1000));
        addChatMessage({
          role: 'assistant',
          content: 'This is a mock response. AI chat requires the Tauri desktop app with an API key configured in Settings.',
          timestamp: Date.now(),
        });
        return;
      }

      const response = await tauriInvoke<string>('ai_chat', {
        messages: apiMessages,
        context,
      });

      addChatMessage({
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setError(errMsg);
    } finally {
      setChatLoading(false);
    }
  }, [input, chatLoading, chatMessages, includeContext, activeTab, addChatMessage, setChatLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // No API key configured
  const noApiKey = aiConfig && !aiConfig.apiKey;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider ${textMuted}`}>
        <span>AI Chat</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIncludeContext(v => !v)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
              includeContext
                ? (theme === 'dark' ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-600')
                : `${textMuted} hover:text-zinc-300`
            }`}
            title={includeContext ? "File context included" : "File context excluded"}
          >
            <FileCode2 size={10} />
            <span>CTX</span>
          </button>
          <button
            onClick={clearChatMessages}
            className={`${textMuted} hover:text-red-400`}
            title="Clear chat"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {chatMessages.length === 0 && !noApiKey && (
          <div className={`text-center py-8 text-xs ${textMuted}`}>
            <p>AI 어시스턴트에게 코드에 대해 질문하세요.</p>
            {includeContext && activeTab && (
              <p className="mt-1 opacity-60">현재 파일: {activeTab.name}</p>
            )}
          </div>
        )}

        {noApiKey && chatMessages.length === 0 && (
          <div className={`text-center py-8 text-xs ${textMuted}`}>
            <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
            <p>API Key가 설정되지 않았습니다.</p>
            <button
              onClick={toggleSettings}
              className="mt-2 flex items-center gap-1 mx-auto px-3 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-500"
            >
              <Settings size={12} />
              Settings에서 설정
            </button>
          </div>
        )}

        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`rounded-lg px-3 py-2 text-xs ${
            msg.role === 'user' ? userBg : assistantBg
          }`}>
            <div className={`text-[10px] mb-1 ${textMuted}`}>
              {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            {msg.role === 'assistant' ? (
              <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-zinc-900 [&_pre]:rounded [&_pre]:p-2 [&_pre]:text-[11px] [&_code]:text-[11px] [&_p]:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{msg.content}</div>
            )}
          </div>
        ))}

        {chatLoading && (
          <div className={`flex items-center gap-2 px-3 py-2 text-xs ${textMuted}`}>
            <Loader2 size={12} className="animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-900/20 text-red-400 text-xs">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`flex items-end gap-2 px-3 py-2 border-t ${border}`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
          rows={1}
          className={`flex-1 px-2.5 py-1.5 rounded text-xs resize-none ${inputBg} outline-none max-h-24 overflow-y-auto`}
          style={{ minHeight: '32px' }}
          disabled={chatLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || chatLoading}
          className={`p-1.5 rounded transition-colors shrink-0 ${
            input.trim() && !chatLoading
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : `${inputBg} ${textMuted} cursor-not-allowed`
          }`}
          title="Send (Enter)"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
