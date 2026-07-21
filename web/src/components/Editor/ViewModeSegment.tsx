import { Pencil, Columns2, Eye } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { ViewMode } from '../../types';

/**
 * Segmented control to switch between editor / split / preview view modes.
 * Shown in the markdown & HTML editor toolbars. "뷰어" closes the left editor.
 */
export function ViewModeSegment({ theme }: { theme: string }) {
  const viewMode = useAppStore(s => s.viewMode);
  const setViewMode = useAppStore(s => s.setViewMode);

  const modes: { mode: ViewMode; label: string; icon: React.ReactNode; title: string }[] = [
    { mode: 'editor', label: '편집', icon: <Pencil size={13} />, title: '편집 (에디터만)' },
    { mode: 'split', label: '분할', icon: <Columns2 size={13} />, title: '분할 (에디터 + 미리보기)' },
    { mode: 'preview', label: '뷰어', icon: <Eye size={13} />, title: '뷰어 (미리보기만)' },
  ];

  const activeBg = theme === 'dark' ? 'bg-zinc-700 text-zinc-100' : 'bg-white text-zinc-800 shadow-sm';
  const inactive = theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700';
  const groupBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';

  return (
    <div className={`flex items-center gap-0.5 rounded-md p-0.5 ${groupBg}`}>
      {modes.map(m => (
        <button
          key={m.mode}
          onClick={() => setViewMode(m.mode)}
          title={m.title}
          aria-pressed={viewMode === m.mode}
          className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-colors ${
            viewMode === m.mode ? activeBg : inactive
          }`}
        >
          {m.icon}
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
