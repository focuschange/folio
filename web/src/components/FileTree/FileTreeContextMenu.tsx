import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

export type ContextMenuItem =
  | { kind: 'item'; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }
  | { kind: 'separator' };

interface FileTreeContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function FileTreeContextMenu({ x, y, items, onClose }: FileTreeContextMenuProps) {
  const theme = useAppStore(s => s.settings.theme);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Reposition if menu would overflow viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 26 - 12);

  const menuBg = theme === 'dark' ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-zinc-200';
  const itemHover = theme === 'dark' ? 'hover:bg-blue-600 hover:text-white' : 'hover:bg-blue-500 hover:text-white';
  const itemText = theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800';
  const dangerText = theme === 'dark' ? 'text-red-400' : 'text-red-600';
  const sepBg = theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200';

  return (
    <div
      ref={ref}
      className={`fixed z-[100] py-1 rounded-md shadow-lg border min-w-[200px] ${menuBg}`}
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, idx) => {
        if (item.kind === 'separator') {
          return <div key={`sep-${idx}`} className={`my-1 h-px ${sepBg}`} />;
        }
        const colorCls = item.danger ? dangerText : itemText;
        return (
          <div
            key={`item-${idx}`}
            onClick={() => {
              if (item.disabled) return;
              item.onClick();
              onClose();
            }}
            className={`px-3 py-1 text-xs cursor-pointer ${colorCls} ${
              item.disabled ? 'opacity-40 cursor-not-allowed' : itemHover
            }`}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
}
