import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export interface MoreMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface MoreMenuDropdownProps {
  items: MoreMenuItem[];
  disabled?: boolean;
}

export function MoreMenuDropdown({ items, disabled }: MoreMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useAppStore(s => s.settings.theme);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200';
  const menuBg = theme === 'dark' ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-zinc-200';
  const menuItemHover = theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100';
  const iconColor = theme === 'dark' ? '#a1a1aa' : '#52525b';

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`p-1.5 rounded-md transition-colors ${hoverBg} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        title="More markdown actions"
      >
        <MoreHorizontal size={16} color={iconColor} />
      </button>
      {open && (
        <div className={`absolute top-full right-0 mt-1 py-1 rounded-md shadow-lg border z-50 min-w-[180px] ${menuBg}`}>
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer ${menuItemHover}`}
              onClick={() => { item.onClick(); setOpen(false); }}
            >
              <span className="opacity-70">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
