import { useAppStore } from '../../store/useAppStore';
import { FileIcon } from '../../utils/fileIcons';
import { X, Clock, FileText } from 'lucide-react';

export function Sidebar() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const recentFiles = useAppStore(s => s.recentFiles);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const closeTab = useAppStore(s => s.closeTab);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const activeBg = theme === 'dark' ? 'bg-zinc-700/50' : 'bg-zinc-200/70';
  const sectionTitle = `text-[11px] font-semibold uppercase tracking-wider px-3 py-2 ${textMuted}`;

  return (
    <div className={`h-full flex flex-col overflow-hidden ${
      theme === 'dark' ? 'bg-zinc-900' : 'bg-white'
    }`}>
      {/* Open Files */}
      <div className="flex-1 min-h-0">
        <div className={`flex items-center gap-1 ${sectionTitle}`}>
          <FileText size={12} />
          Open Files
        </div>
        <div className="overflow-y-auto max-h-[50%]">
          {tabs.length === 0 ? (
            <div className={`px-3 py-2 text-xs ${textMuted}`}>No open files</div>
          ) : (
            tabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-1 cursor-pointer text-sm group ${hoverBg} ${
                  tab.id === activeTabId ? activeBg : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <FileIcon name={tab.name} size={14} />
                <span className="truncate flex-1 text-xs">
                  {tab.dirty && <span className="text-blue-400 mr-1">*</span>}
                  {tab.name}
                </span>
                {!tab.pinned && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-zinc-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Files */}
      <div className="flex-1 min-h-0 border-t border-zinc-700/50">
        <div className={`flex items-center gap-1 ${sectionTitle}`}>
          <Clock size={12} />
          Recent Files
        </div>
        <div className="overflow-y-auto">
          {recentFiles.length === 0 ? (
            <div className={`px-3 py-2 text-xs ${textMuted}`}>No recent files</div>
          ) : (
            recentFiles.slice(0, 10).map(path => {
              const name = path.split('/').pop() || path;
              return (
                <div
                  key={path}
                  className={`flex items-center gap-2 px-3 py-1 cursor-pointer text-xs ${hoverBg} ${textMuted}`}
                  title={path}
                >
                  <FileIcon name={name} size={14} />
                  <span className="truncate">{name}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
