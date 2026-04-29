import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Send, Trash2, FileCode2, Loader2, AlertCircle, Settings, Square, Copy, ArrowDownToLine, Check } from 'lucide-react';
import type { ChatMessage, AiConfig } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamAiChat, type StreamController } from '../../utils/aiStream';
import { getMonacoEditorRef } from './Toolbar';
import { insertAtCursor } from '../../utils/markdownActions';
import {
  matchTemplatePrefix,
  parseSlashCommand,
  expandUserMessage,
  type PromptTemplate,
} from '../../utils/promptTemplates';
import {
  autocompleteFor,
  resolveMentions,
  type AutocompleteEntry,
} from '../../utils/mentions';
import { MentionHighlight } from './MentionHighlight';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// -------- Code block with Apply/Copy/Insert toolbar --------

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
  theme: 'dark' | 'light';
}

function CodeBlock({ inline, className, children, theme }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  // Inline code renders as default
  if (inline) {
    return <code className={className}>{children}</code>;
  }

  const codeText = String(children).replace(/\n$/, '');
  const lang = /language-(\w+)/.exec(className ?? '')?.[1] ?? '';

  const doCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const doInsert = () => {
    const ed = getMonacoEditorRef();
    if (!ed) return;
    insertAtCursor(ed, codeText);
  };

  const doApply = () => {
    const ed = getMonacoEditorRef();
    if (!ed) return;
    const sel = ed.getSelection();
    const model = ed.getModel();
    if (!sel || !model) return;
    if (sel.isEmpty()) {
      // No selection → replace whole file (with undo support via executeEdits)
      const confirmed = window.confirm('선택 영역이 없습니다. 전체 파일을 이 코드로 교체할까요?');
      if (!confirmed) return;
      ed.executeEdits('ai-apply', [{ range: model.getFullModelRange(), text: codeText }]);
    } else {
      ed.executeEdits('ai-apply', [{ range: sel, text: codeText }]);
    }
    ed.focus();
    setApplied(true);
    setTimeout(() => setApplied(false), 1200);
  };

  const btnBase = theme === 'dark'
    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700';

  return (
    <div className="relative group my-1.5">
      <div className="flex items-center justify-between px-2 py-1 rounded-t bg-zinc-900/60 text-[10px] text-zinc-400">
        <span className="font-mono">{lang || 'text'}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={doCopy}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${btnBase}`}
            title="Copy to clipboard"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={doInsert}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${btnBase}`}
            title="Insert at cursor"
          >
            <ArrowDownToLine size={10} />
            <span>Insert</span>
          </button>
          <button
            onClick={doApply}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${applied ? 'bg-emerald-700 text-white' : btnBase}`}
            title="Replace selection (or file if no selection)"
          >
            {applied ? <Check size={10} /> : null}
            <span>{applied ? 'Applied' : 'Apply'}</span>
          </button>
        </div>
      </div>
      <pre className="!mt-0 !rounded-t-none"><code className={className}>{children}</code></pre>
    </div>
  );
}

// -------- Main panel --------

export function AiChatPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const chatMessages = useAppStore(s => s.chatMessages);
  const chatLoading = useAppStore(s => s.chatLoading);
  const addChatMessage = useAppStore(s => s.addChatMessage);
  const clearChatMessages = useAppStore(s => s.clearChatMessages);
  const setChatLoading = useAppStore(s => s.setChatLoading);
  const appendToLastAssistantMessage = useAppStore(s => s.appendToLastAssistantMessage);
  const setLastAssistantMessage = useAppStore(s => s.setLastAssistantMessage);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const toggleSettings = useAppStore(s => s.toggleSettings);
  const fileTree = useAppStore(s => s.fileTree);
  const projectRoot = useAppStore(s => s.projectRoot);
  const recentFiles = useAppStore(s => s.recentFiles);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0);
  const [includeContext, setIncludeContext] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const streamCtrlRef = useRef<StreamController | null>(null);

  // Slash-command dropdown state
  const [slashIndex, setSlashIndex] = useState(0);
  const slashMatches: PromptTemplate[] = (() => {
    const m = /^\/([a-z0-9_-]*)$/i.exec(input);
    if (!m) return [];
    return matchTemplatePrefix(m[1]);
  })();
  const showSlashDropdown = slashMatches.length > 0;

  useEffect(() => {
    if (slashIndex >= slashMatches.length) setSlashIndex(0);
  }, [slashMatches.length, slashIndex]);

  // @mention dropdown state
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionAuto = autocompleteFor({ text: input, cursor, tabs, recentFiles, fileTree });
  const mentionEntries = mentionAuto?.entries ?? [];
  const showMentionDropdown = mentionEntries.length > 0 && !showSlashDropdown;

  useEffect(() => {
    if (mentionIndex >= mentionEntries.length) setMentionIndex(0);
  }, [mentionEntries.length, mentionIndex]);

  // Mirror overlay scroll-sync: keep chip layer aligned with textarea scroll
  const syncMirrorScroll = useCallback(() => {
    const ta = textareaRef.current;
    const mi = mirrorRef.current;
    if (ta && mi) mi.scrollTop = ta.scrollTop;
  }, []);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const inputBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const userBg = theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50';
  const assistantBg = theme === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-50';

  useEffect(() => {
    if (!isTauri) return;
    tauriInvoke<string>('load_ai_config')
      .then(json => {
        const config = JSON.parse(json);
        setAiConfig({
          provider: config.provider || 'claude',
          // API key is masked server-side; presence is indicated by has_api_key
          apiKey: config.has_api_key ? '(configured)' : '',
          model: config.model || 'claude-sonnet-4-20250514',
        });
      })
      .catch(() => setAiConfig(null));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Cleanup: cancel any in-flight stream when panel unmounts
  useEffect(() => {
    return () => {
      streamCtrlRef.current?.cancel();
    };
  }, []);

  const handleSend = useCallback(async () => {
    const raw = input.trim();
    if (!raw || chatLoading) return;

    setError(null);
    setInput('');

    // Slash command: same as before
    const slash = parseSlashCommand(raw);
    const displayContent = slash ? expandUserMessage(slash.template, slash.rest || '(current file context)') : raw;
    const systemOverride = slash ? slash.template.systemPrompt : undefined;
    const useContext = slash ? (slash.template.useFileContext ?? true) : includeContext;

    // @mentions: resolve now (async — may hit Tauri for file reads / git diff)
    let mentionBlock = '';
    if (isTauri) {
      try {
        const { contextBlock } = await resolveMentions(displayContent, { tabs, projectRoot });
        mentionBlock = contextBlock;
      } catch (e) {
        // If resolution explodes entirely, just send plain text — don't block the user
        console.error('[folio] mention resolution failed', e);
      }
    }

    const userMsg: ChatMessage = { role: 'user', content: displayContent, timestamp: Date.now() };
    addChatMessage(userMsg);

    const allMessages = [...chatMessages, userMsg];
    const apiMessages = allMessages.map(m => ({ role: m.role, content: m.content }));

    // Context priority:
    //   mentionBlock (resolved @mentions)  always wins when present
    //   else fallback to active-tab snippet (existing behavior)
    let context: string | undefined;
    if (mentionBlock) {
      context = mentionBlock;
    } else if (useContext && activeTab) {
      context = `File: ${activeTab.path}\nLanguage: ${activeTab.language}\n\n${activeTab.content.slice(0, 8000)}`;
    }

    if (!isTauri) {
      addChatMessage({
        role: 'assistant',
        content: 'This is a mock response. AI chat requires the Tauri desktop app with an API key configured in Settings.',
        timestamp: Date.now(),
      });
      return;
    }

    addChatMessage({ role: 'assistant', content: '', timestamp: Date.now() });
    setChatLoading(true);

    const ctrl = await streamAiChat(
      { messages: apiMessages, context, systemOverride },
      {
        onChunk: (delta) => appendToLastAssistantMessage(delta),
        onDone: (full) => {
          setLastAssistantMessage(full);
          setChatLoading(false);
          streamCtrlRef.current = null;
        },
        onError: (err) => {
          setError(err);
          setChatLoading(false);
          streamCtrlRef.current = null;
        },
      },
    );
    streamCtrlRef.current = ctrl;
  }, [input, chatLoading, chatMessages, includeContext, activeTab, tabs, projectRoot, addChatMessage, setChatLoading, appendToLastAssistantMessage, setLastAssistantMessage]);

  const handleStop = useCallback(() => {
    streamCtrlRef.current?.cancel();
    streamCtrlRef.current = null;
    setChatLoading(false);
  }, [setChatLoading]);

  const applySlashCompletion = (tpl: PromptTemplate) => {
    setInput(`/${tpl.name} `);
    setSlashIndex(0);
    textareaRef.current?.focus();
  };

  /** Replace the current mention token (start..end) with the chosen insert text + trailing space. */
  const applyMentionCompletion = (entry: AutocompleteEntry) => {
    if (!mentionAuto) return;
    const { start, end } = mentionAuto.token;
    const before = input.slice(0, start);
    const after = input.slice(end);
    // Category stage → insert the prefix so user can continue typing the arg
    // Arg stage → insert fully-qualified token + trailing space
    const isCategory = mentionAuto.kind === 'category';
    const insert = isCategory ? entry.insertText : entry.insertText + ' ';
    const next = before + insert + after;
    setInput(next);
    const newCursor = before.length + insert.length;
    setCursor(newCursor);
    // Move textarea caret after insert
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(newCursor, newCursor);
      }
    });
    setMentionIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // @-mention dropdown takes precedence over send when visible
    if (showMentionDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => Math.min(i + 1, mentionEntries.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const entry = mentionEntries[mentionIndex];
        if (entry) applyMentionCompletion(entry);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionIndex(0);
        // Move cursor past the token to suppress the dropdown
        const ta = textareaRef.current;
        if (ta) {
          ta.setSelectionRange(input.length, input.length);
          setCursor(input.length);
        }
        return;
      }
    }
    if (showSlashDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex(i => Math.min(i + 1, slashMatches.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const tpl = slashMatches[slashIndex];
        if (tpl) applySlashCompletion(tpl);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput('');
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const noApiKey = aiConfig && !aiConfig.apiKey;

  return (
    <div className="h-full flex flex-col overflow-hidden">
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

        {chatMessages.map((msg, idx) => {
          const isLast = idx === chatMessages.length - 1;
          const isStreamingThis = isLast && chatLoading && msg.role === 'assistant';
          return (
            <div key={idx} className={`rounded-lg px-3 py-2 text-xs ${
              msg.role === 'user' ? userBg : assistantBg
            }`}>
              <div className={`text-[10px] mb-1 flex items-center gap-1 ${textMuted}`}>
                <span>{msg.role === 'user' ? 'You' : 'AI'}</span>
                {isStreamingThis && <Loader2 size={10} className="animate-spin" />}
              </div>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-zinc-900 [&_pre]:rounded-b [&_pre]:p-2 [&_pre]:text-[11px] [&_code]:text-[11px] [&_p]:my-1">
                  {msg.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      urlTransform={(url) => {
                        if (/^(https?|asset|data):/i.test(url)) return url;
                        return '';
                      }}
                      components={{
                        code: (props) => <CodeBlock theme={theme as 'dark' | 'light'} {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <span className={textMuted}>...</span>
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">
                  <MentionHighlight text={msg.content} />
                </div>
              )}
            </div>
          );
        })}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-900/20 text-red-400 text-xs">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={`relative flex items-end gap-2 px-3 py-2 border-t ${border}`}>
        {/* Slash dropdown */}
        {showSlashDropdown && (
          <div className={`absolute left-3 right-3 bottom-full mb-1 rounded border shadow-lg overflow-hidden ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
          }`}>
            <div className={`px-2 py-1 text-[10px] uppercase tracking-wider ${textMuted}`}>
              Slash Commands ({slashMatches.length})
            </div>
            {slashMatches.map((tpl, i) => (
              <button
                key={tpl.name}
                type="button"
                onMouseEnter={() => setSlashIndex(i)}
                onClick={() => applySlashCompletion(tpl)}
                className={`w-full text-left px-2 py-1.5 text-xs flex items-baseline gap-2 ${
                  i === slashIndex
                    ? (theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100')
                    : ''
                }`}
              >
                <span className="font-mono text-blue-400">/{tpl.name}</span>
                <span className={textMuted}>— {tpl.description}</span>
              </button>
            ))}
          </div>
        )}

        {/* @mention dropdown */}
        {showMentionDropdown && (
          <div className={`absolute left-3 right-3 bottom-full mb-1 rounded border shadow-lg overflow-hidden max-h-60 overflow-y-auto ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
          }`}>
            <div className={`sticky top-0 px-2 py-1 text-[10px] uppercase tracking-wider ${textMuted} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>
              {mentionAuto?.kind === 'category' ? 'Mention Categories' : 'Mention Targets'} ({mentionEntries.length})
            </div>
            {mentionEntries.map((entry, i) => (
              <button
                key={entry.insertText + i}
                type="button"
                onMouseEnter={() => setMentionIndex(i)}
                onClick={() => applyMentionCompletion(entry)}
                className={`w-full text-left px-2 py-1.5 text-xs flex items-baseline gap-2 ${
                  i === mentionIndex
                    ? (theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100')
                    : ''
                }`}
              >
                <span className="font-mono text-blue-400">{entry.label}</span>
                {entry.hint && <span className={textMuted}>— {entry.hint}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Input with mirror overlay for @mention chip rendering.
            Both layers MUST share identical font-family, font-size, line-height,
            and padding — otherwise the caret drifts away from the chip visuals. */}
        <div className="relative flex-1">
          <div
            ref={mirrorRef}
            aria-hidden="true"
            className="folio-mention-mirror px-2.5 py-1.5 text-xs"
            style={{ minHeight: '72px', maxHeight: '192px', lineHeight: 1.5 }}
          >
            <MentionHighlight text={input + '\u200b'} />
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); setCursor(e.target.selectionStart ?? 0); }}
            onKeyUp={e => setCursor((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
            onClick={e => setCursor((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
            onScroll={syncMirrorScroll}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (@ 멘션 • / 슬래시 명령 • Enter: 전송)"
            rows={3}
            className={`relative w-full px-2.5 py-1.5 text-xs resize-none outline-none overflow-y-auto rounded`}
            style={{
              minHeight: '72px',
              maxHeight: '192px',
              color: 'transparent',
              caretColor: theme === 'dark' ? '#e4e4e7' : '#18181b',
              background: 'transparent',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
            disabled={chatLoading}
          />
          {/* Background box behind both layers so inputBg shows consistently */}
          <div className={`absolute inset-0 -z-10 rounded ${inputBg}`} />
        </div>
        {chatLoading ? (
          <button
            onClick={handleStop}
            className="p-1.5 rounded bg-red-600 text-white hover:bg-red-500 shrink-0"
            title="Stop streaming"
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`p-1.5 rounded transition-colors shrink-0 ${
              input.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : `${inputBg} ${textMuted} cursor-not-allowed`
            }`}
            title="Send (Enter)"
          >
            <Send size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
