import { useAppStore } from '../../store/useAppStore';
import { FileIcon } from '../../utils/fileIcons';
import { X, Pin } from 'lucide-react';

export function FilesPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const closeTab = useAppStore(s => s.closeTab);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const activeBg = theme === 'dark' ? 'bg-zinc-700/50' : 'bg-zinc-200/70';

  if (tabs.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${textMuted}`}>
        No open files
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`flex items-center gap-2 px-3 py-1 cursor-pointer text-xs group ${hoverBg} ${
            tab.id === activeTabId ? activeBg : ''
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          <FileIcon name={tab.name} size={14} />
          <span className="truncate flex-1">
            {tab.dirty && <span className="text-blue-400 mr-0.5">*</span>}
            {tab.name}
          </span>
          {tab.pinned && (
            <Pin size={10} className={textMuted} />
          )}
          {!tab.pinned && (
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-zinc-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
