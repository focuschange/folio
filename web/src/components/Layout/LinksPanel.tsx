import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMonacoEditorRef } from './Toolbar';
import { extractLinks } from '../../utils/linkExtractor';
import { Link2, ExternalLink } from 'lucide-react';

export function LinksPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const activeTabId = useAppStore(s => s.activeTabId);
  const tabs = useAppStore(s => s.tabs);
  const activeTab = tabs.find(t => t.id === activeTabId);

  const links = useMemo(() => {
    if (!activeTab) return [];
    return extractLinks(activeTab.content, activeTab.language);
  }, [activeTab?.content, activeTab?.language]);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const text = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';
  const urlColor = theme === 'dark' ? 'text-blue-400' : 'text-blue-600';

  const handleJumpToLine = (line: number) => {
    const editor = getMonacoEditorRef();
    if (editor) {
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
    }
  };

  const handleOpenExternal = async (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ('__TAURI_INTERNALS__' in window) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('plugin:shell|open', { path: url });
      } catch {
        // Fallback: copy to clipboard
        navigator.clipboard?.writeText(url);
      }
    } else {
      window.open(url, '_blank');
    }
  };

  if (!activeTab) {
    return <div className={`p-4 text-xs ${textMuted}`}>No file selected</div>;
  }
  if (links.length === 0) {
    return <div className={`p-4 text-xs ${textMuted}`}>No links found</div>;
  }

  return (
    <div className="h-full overflow-y-auto py-1">
      <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wider ${textMuted}`}>
        {links.length} link{links.length !== 1 ? 's' : ''}
      </div>
      {links.map((l, idx) => (
        <div
          key={idx}
          onClick={() => handleJumpToLine(l.lineNumber)}
          className={`group px-3 py-1.5 text-xs cursor-pointer ${hoverBg}`}
          title={`Line ${l.lineNumber}\n${l.url}`}
        >
          <div className="flex items-center gap-1.5">
            <Link2 size={10} className={`shrink-0 ${textMuted}`} />
            <span className={`truncate flex-1 ${text}`}>{l.text}</span>
            <button
              onClick={(e) => handleOpenExternal(l.url, e)}
              className={`opacity-0 group-hover:opacity-100 ${textMuted} hover:text-blue-400`}
              title="Open external"
            >
              <ExternalLink size={10} />
            </button>
          </div>
          <div className={`truncate mt-0.5 text-[10px] ${urlColor}`} style={{ paddingLeft: 16 }}>
            {l.url}
          </div>
        </div>
      ))}
    </div>
  );
}
