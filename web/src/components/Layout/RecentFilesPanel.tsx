import { useAppStore } from '../../store/useAppStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { FileIcon } from '../../utils/fileIcons';
import { Trash2 } from 'lucide-react';

export function RecentFilesPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const recentFiles = useAppStore(s => s.recentFiles);
  const clearRecentFiles = useAppStore(s => s.clearRecentFiles);
  const { openFileInEditor } = useFileSystem();

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const text = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';

  if (recentFiles.length === 0) {
    return <div className={`p-4 text-xs ${textMuted}`}>No recent files</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider ${textMuted}`}>
        <span>{recentFiles.length} recent</span>
        <button
          onClick={clearRecentFiles}
          className={`${textMuted} hover:text-red-400`}
          title="Clear history"
        >
          <Trash2 size={10} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {recentFiles.map((path, idx) => {
          const name = path.split('/').pop() ?? path;
          return (
            <div
              key={`${path}-${idx}`}
              onClick={() => openFileInEditor(path, name)}
              className={`flex items-center gap-2 px-3 py-1 text-xs cursor-pointer ${hoverBg} ${text}`}
              title={path}
            >
              <FileIcon name={name} size={13} />
              <span className="truncate flex-1">{name}</span>
              <span className={`truncate text-[10px] ${textMuted}`} style={{ maxWidth: 100 }}>
                {path.replace(/\/[^/]+$/, '')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
