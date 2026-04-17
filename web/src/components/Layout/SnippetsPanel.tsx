import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { snippetsByLanguage, type Snippet } from '../../utils/snippets';
import { getMonacoEditorRef } from './Toolbar';
import { Code2, Search, Copy } from 'lucide-react';

export function SnippetsPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [search, setSearch] = useState('');
  const [expandedLang, setExpandedLang] = useState<string | null>(null);

  const currentLang = activeTab?.language ?? '';

  // Build snippet list: current language first, then all others
  const allSnippets = useMemo(() => {
    const result: { lang: string; snippets: Snippet[] }[] = [];
    if (currentLang && snippetsByLanguage[currentLang]) {
      result.push({ lang: currentLang, snippets: snippetsByLanguage[currentLang] });
    }
    for (const [lang, snips] of Object.entries(snippetsByLanguage)) {
      if (lang !== currentLang) {
        result.push({ lang, snippets: snips });
      }
    }
    return result;
  }, [currentLang]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allSnippets;
    const q = search.toLowerCase();
    return allSnippets
      .map(g => ({
        lang: g.lang,
        snippets: g.snippets.filter(s =>
          s.prefix.toLowerCase().includes(q) ||
          s.label.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.snippets.length > 0);
  }, [allSnippets, search]);

  const insertSnippet = (snippet: Snippet) => {
    const editor = getMonacoEditorRef();
    if (!editor) return;
    // Strip snippet placeholders ($1, ${1:text}, etc.)
    const text = snippet.body
      .replace(/\$\{?\d+:?([^}]*)?\}?/g, '$1')
      .replace(/\$\d+/g, '');
    const sel = editor.getSelection();
    if (sel) {
      editor.executeEdits('snippet-insert', [{ range: sel, text }]);
    }
    editor.focus();
  };

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';
  const inputBg = theme === 'dark' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800';

  return (
    <div className={`h-full flex flex-col ${bg} overflow-hidden`}>
      {/* Search */}
      <div className={`px-3 py-2 border-b ${border}`}>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${inputBg}`}>
          <Search size={12} className={textMuted} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search snippets..."
            className="flex-1 bg-transparent text-xs outline-none"
          />
        </div>
      </div>

      {/* Snippet list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className={`px-3 py-6 text-center text-xs ${textMuted}`}>
            <Code2 size={24} className="mx-auto mb-2 opacity-30" />
            No snippets found
          </div>
        ) : (
          filtered.map(({ lang, snippets }) => {
            const isExpanded = expandedLang === lang || lang === currentLang || search.trim() !== '';
            return (
              <div key={lang}>
                <button
                  onClick={() => setExpandedLang(expandedLang === lang ? null : lang)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-b ${border} ${
                    lang === currentLang
                      ? (theme === 'dark' ? 'text-blue-400 bg-blue-900/10' : 'text-blue-600 bg-blue-50')
                      : textMuted
                  }`}
                >
                  <span className="flex-1 text-left">{lang}</span>
                  <span className="text-[10px] font-normal">{snippets.length}</span>
                </button>
                {isExpanded && snippets.map((snippet, i) => (
                  <button
                    key={`${lang}-${i}`}
                    onClick={() => insertSnippet(snippet)}
                    className={`w-full text-left px-3 py-1.5 ${hoverBg} group cursor-pointer`}
                  >
                    <div className="flex items-center gap-2">
                      <code className={`text-[11px] font-mono ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`}>
                        {snippet.prefix}
                      </code>
                      <span className="text-xs truncate flex-1">{snippet.label}</span>
                      <Copy size={10} className={`${textMuted} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    <p className={`text-[10px] ${textMuted} truncate mt-0.5`}>{snippet.description}</p>
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
