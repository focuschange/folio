import { useAppStore } from '../../store/useAppStore';
import { ChevronRight } from 'lucide-react';
import { FileIcon } from '../../utils/fileIcons';

export function BreadcrumbBar() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const activeTab = tabs.find(t => t.id === activeTabId);

  if (!activeTab) return null;

  const parts = activeTab.path.split('/').filter(Boolean);
  const textColor = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const hoverColor = theme === 'dark' ? 'hover:text-zinc-200' : 'hover:text-zinc-800';

  return (
    <div className={`flex items-center gap-0.5 px-3 py-1 text-xs overflow-x-auto select-none border-b ${
      theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-zinc-50 border-zinc-200/50'
    } ${textColor}`}>
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-0.5 shrink-0">
          {i > 0 && <ChevronRight size={12} className="opacity-40" />}
          {i === parts.length - 1 ? (
            <span className="flex items-center gap-1">
              <FileIcon name={part} size={12} />
              <span className={theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}>{part}</span>
            </span>
          ) : (
            <span className={`cursor-pointer ${hoverColor} transition-colors`}>{part}</span>
          )}
        </span>
      ))}
    </div>
  );
}
