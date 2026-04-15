import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { getMonacoEditorRef } from './Toolbar';
import { FileIcon } from '../../utils/fileIcons';
import { Bookmark, X, Trash2 } from 'lucide-react';

export function BookmarksPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const bookmarks = useAppStore(s => s.bookmarks);
  const removeBookmark = useAppStore(s => s.removeBookmark);
  const clearBookmarksForFile = useAppStore(s => s.clearBookmarksForFile);
  const activeTabId = useAppStore(s => s.activeTabId);
  const tabs = useAppStore(s => s.tabs);
  const { openFileInEditor } = useFileSystem();

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const text = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';
  const border = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';

  const paths = useMemo(() => Object.keys(bookmarks).sort(), [bookmarks]);
  const total = useMemo(
    () => Object.values(bookmarks).reduce((sum, lines) => sum + lines.length, 0),
    [bookmarks]
  );

  const jumpTo = async (path: string, line: number) => {
    const name = path.split('/').pop() ?? path;
    const existingTab = tabs.find(t => t.path === path);
    if (!existingTab) {
      await openFileInEditor(path, name);
    } else if (activeTabId !== existingTab.id) {
      useAppStore.getState().setActiveTab(existingTab.id);
    }
    setTimeout(() => {
      const editor = getMonacoEditorRef();
      if (editor) {
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
      }
    }, 150);
  };

  if (paths.length === 0) {
    return (
      <div className={`p-4 text-xs ${textMuted}`}>
        No bookmarks. Press ⌘F2 on a line to toggle.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wider ${textMuted}`}>
        {total} bookmark{total !== 1 ? 's' : ''} in {paths.length} file{paths.length !== 1 ? 's' : ''}
      </div>
      <div className="flex-1 overflow-y-auto">
        {paths.map(path => {
          const lines = bookmarks[path];
          const name = path.split('/').pop() ?? path;
          return (
            <div key={path} className={`border-t ${border}`}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs group ${text}`}>
                <FileIcon name={name} size={13} />
                <span className="truncate flex-1" title={path}>{name}</span>
                <button
                  onClick={() => clearBookmarksForFile(path)}
                  className={`opacity-0 group-hover:opacity-100 ${textMuted} hover:text-red-400`}
                  title="Clear bookmarks for this file"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              {lines.map(line => (
                <div
                  key={line}
                  onClick={() => jumpTo(path, line)}
                  className={`group flex items-center gap-2 pl-8 pr-3 py-1 text-xs cursor-pointer ${hoverBg} ${text}`}
                  title={`Jump to ${path}:${line}`}
                >
                  <Bookmark size={10} className="text-blue-400 shrink-0" />
                  <span className={`text-[10px] font-mono ${textMuted}`}>Line {line}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeBookmark(path, line); }}
                    className={`ml-auto opacity-0 group-hover:opacity-100 ${textMuted} hover:text-red-400`}
                    title="Remove bookmark"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
