import { useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { Search, X, CaseSensitive, Regex } from 'lucide-react';
import { FileIcon } from '../../utils/fileIcons';
import type { SearchResult } from '../../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export function ProjectSearch() {
  const theme = useAppStore(s => s.settings.theme);
  const setSearchVisible = useAppStore(s => s.setSearchVisible);
  const projectRoot = useAppStore(s => s.projectRoot);
  const { openFileInEditor } = useFileSystem();

  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);

    if (isTauri && projectRoot) {
      try {
        // Rust: search_in_files(root, query, case_sensitive, use_regex)
        const res = await tauriInvoke<SearchResult[]>('search_in_files', {
          root: projectRoot, query, caseSensitive, useRegex,
        });
        setResults(res);
      } catch (e) {
        console.error('Search failed:', e);
      }
    } else {
      // Mock search results
      setResults([
        { path: '/project/src/components/App.tsx', lineNumber: 5, lineContent: '  return (' },
        { path: '/project/src/components/App.tsx', lineNumber: 12, lineContent: '          <h1>Welcome to Folio</h1>' },
        { path: '/project/src/main.tsx', lineNumber: 2, lineContent: "import { App } from './components/App';" },
        { path: '/project/package.json', lineNumber: 3, lineContent: '  "version": "1.0.0",' },
        { path: '/project/docs/README.md', lineNumber: 1, lineContent: '# Folio Editor' },
      ]);
    }
    setSearching(false);
  }, [query, caseSensitive, useRegex, projectRoot]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') setSearchVisible(false);
  };

  const handleResultClick = (result: SearchResult) => {
    const name = result.path.split('/').pop() || result.path;
    openFileInEditor(result.path, name);
  };

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const inputBg = theme === 'dark' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const toggleActive = theme === 'dark' ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-300 text-zinc-800';
  const toggleInactive = theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500';

  // Group results by file
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.path]) acc[r.path] = [];
    acc[r.path].push(r);
    return acc;
  }, {});

  return (
    <div className={`h-full flex flex-col ${bg} border-r ${border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${border}`}>
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${textMuted}`}>
          Search
        </span>
        <button onClick={() => setSearchVisible(false)} className={`p-0.5 rounded ${hoverBg}`}>
          <X size={14} />
        </button>
      </div>

      {/* Search input */}
      <div className="px-3 py-2 space-y-2">
        <div className={`flex items-center gap-1 px-2 py-1.5 rounded-md ${inputBg}`}>
          <Search size={14} className="shrink-0 opacity-50" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="bg-transparent outline-none flex-1 text-xs"
            autoFocus
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`p-1 rounded text-xs ${caseSensitive ? toggleActive : toggleInactive}`}
            title="Case Sensitive"
          >
            <CaseSensitive size={14} />
          </button>
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={`p-1 rounded text-xs ${useRegex ? toggleActive : toggleInactive}`}
            title="Regular Expression"
          >
            <Regex size={14} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searching ? (
          <div className={`px-3 py-4 text-center text-xs ${textMuted}`}>Searching...</div>
        ) : results.length === 0 ? (
          <div className={`px-3 py-4 text-center text-xs ${textMuted}`}>
            {query ? 'No results found' : 'Type to search'}
          </div>
        ) : (
          <div>
            <div className={`px-3 py-1 text-xs ${textMuted}`}>
              {results.length} result{results.length !== 1 ? 's' : ''} in {Object.keys(grouped).length} file{Object.keys(grouped).length !== 1 ? 's' : ''}
            </div>
            {Object.entries(grouped).map(([path, items]) => {
              const name = path.split('/').pop() || path;
              return (
                <div key={path}>
                  <div className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium ${textMuted}`}>
                    <FileIcon name={name} size={14} />
                    <span className="truncate">{name}</span>
                    <span className="opacity-50">({items.length})</span>
                  </div>
                  {items.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => handleResultClick(r)}
                      className={`flex items-start gap-2 px-6 py-1 cursor-pointer text-xs ${hoverBg} transition-colors`}
                    >
                      <span className={`shrink-0 w-8 text-right ${textMuted}`}>{r.lineNumber}</span>
                      <span className="truncate font-mono text-[11px]">{r.lineContent.trim()}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectSearchPanel() {
  const searchVisible = useAppStore(s => s.searchVisible);
  if (!searchVisible) return null;
  return <ProjectSearch />;
}
