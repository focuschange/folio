import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { getMonacoEditorRef } from './Toolbar';
import { RefreshCw, Bug, AlertTriangle, Wrench } from 'lucide-react';
import type { TodoItem, SearchResult } from '../../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function TodoPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const projectRoot = useAppStore(s => s.projectRoot);
  const todoItems = useAppStore(s => s.todoItems);
  const setTodoItems = useAppStore(s => s.setTodoItems);
  const { openFileInEditor } = useFileSystem();
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (!projectRoot || !isTauri) return;
    setLoading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const results = await invoke<SearchResult[]>('search_in_files', {
        root: projectRoot,
        query: '(TODO|FIXME|HACK)',
        caseSensitive: true,
        useRegex: true,
      });
      const parsed: TodoItem[] = [];
      for (const r of results) {
        const m = r.lineContent.match(/\b(TODO|FIXME|HACK)\b/);
        if (m) {
          parsed.push({
            type: m[1] as 'TODO' | 'FIXME' | 'HACK',
            path: r.path,
            lineNumber: r.lineNumber,
            lineContent: r.lineContent.trim(),
          });
        }
      }
      setTodoItems(parsed);
    } catch (e) {
      console.error('TODO search error:', e);
    } finally {
      setLoading(false);
    }
  }, [projectRoot, setTodoItems]);

  // Initial load
  useEffect(() => {
    if (projectRoot && todoItems.length === 0) {
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRoot]);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const text = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';

  const typeIcon = (t: string) => {
    if (t === 'TODO') return <Bug size={10} className="text-blue-400 shrink-0" />;
    if (t === 'FIXME') return <AlertTriangle size={10} className="text-yellow-400 shrink-0" />;
    return <Wrench size={10} className="text-purple-400 shrink-0" />;
  };

  const handleClick = async (item: TodoItem) => {
    const name = item.path.split('/').pop() ?? item.path;
    await openFileInEditor(item.path, name);
    // After open, jump to line
    setTimeout(() => {
      const editor = getMonacoEditorRef();
      if (editor) {
        editor.revealLineInCenter(item.lineNumber);
        editor.setPosition({ lineNumber: item.lineNumber, column: 1 });
        editor.focus();
      }
    }, 150);
  };

  if (!projectRoot) {
    return <div className={`p-4 text-xs ${textMuted}`}>Open a folder to search</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider ${textMuted}`}>
        <span>{loading ? 'searching...' : `${todoItems.length} item${todoItems.length !== 1 ? 's' : ''}`}</span>
        <button onClick={search} className={`${textMuted} hover:text-blue-400 ${loading ? 'animate-spin' : ''}`} title="Refresh">
          <RefreshCw size={10} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {todoItems.length === 0 && !loading && (
          <div className={`p-4 text-xs ${textMuted}`}>No TODO/FIXME/HACK found</div>
        )}
        {todoItems.map((item, idx) => {
          const relPath = projectRoot ? item.path.replace(projectRoot + '/', '') : item.path;
          return (
            <div
              key={idx}
              onClick={() => handleClick(item)}
              className={`px-3 py-1.5 text-xs cursor-pointer ${hoverBg} ${text}`}
              title={`${item.path}:${item.lineNumber}`}
            >
              <div className="flex items-center gap-1.5">
                {typeIcon(item.type)}
                <span className="font-mono text-[10px] opacity-70">{item.type}</span>
                <span className={`ml-auto text-[10px] ${textMuted}`}>{item.lineNumber}</span>
              </div>
              <div className="truncate mt-0.5" style={{ paddingLeft: 16 }}>{item.lineContent}</div>
              <div className={`truncate text-[10px] ${textMuted}`} style={{ paddingLeft: 16 }}>{relPath}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
