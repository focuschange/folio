import { useAppStore } from '../../store/useAppStore';
import { GitBranch } from 'lucide-react';
import { countWords, countLines } from '../../utils/markdownUtils';

export function StatusBar() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const gitBranch = useAppStore(s => s.gitBranch);
  const activeTab = tabs.find(t => t.id === activeTabId);

  const content = activeTab?.content || '';
  const words = countWords(content);
  const lines = countLines(content);
  const line = activeTab?.cursorLine || 1;
  const col = activeTab?.cursorColumn || 1;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const itemClass = `px-2 py-0.5 text-xs cursor-default select-none truncate ${
    theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
  } transition-colors rounded`;

  return (
    <div className={`flex items-center justify-between px-2 h-6 border-t text-xs select-none shrink-0 ${
      theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
    }`}>
      <div className="flex items-center gap-1 min-w-0">
        {gitBranch && (
          <span className={`${itemClass} flex items-center gap-1`}>
            <GitBranch size={12} />
            {gitBranch}
          </span>
        )}
        {activeTab && (
          <span
            className={`${itemClass} cursor-pointer`}
            onClick={() => copyToClipboard(activeTab.path)}
            title="Click to copy path"
          >
            {activeTab.path}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {activeTab && (
          <>
            <span className={itemClass}>
              Ln {line}, Col {col}
            </span>
            <span className={itemClass}>
              {words} words, {lines} lines
            </span>
            <span className={`${itemClass} cursor-pointer`}>
              {activeTab.encoding}
            </span>
            <span className={`${itemClass} cursor-pointer`}>
              {activeTab.language}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
