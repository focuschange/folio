import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Heading } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface HeadingDropdownProps {
  onSelect: (level: number) => void;
  disabled?: boolean;
}

export function HeadingDropdown({ onSelect, disabled }: HeadingDropdownProps) {
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

  const headings = [
    { level: 0, label: 'Paragraph', size: 'text-xs' },
    { level: 1, label: 'Heading 1', size: 'text-2xl font-bold' },
    { level: 2, label: 'Heading 2', size: 'text-xl font-bold' },
    { level: 3, label: 'Heading 3', size: 'text-lg font-bold' },
    { level: 4, label: 'Heading 4', size: 'text-base font-bold' },
    { level: 5, label: 'Heading 5', size: 'text-sm font-bold' },
    { level: 6, label: 'Heading 6', size: 'text-xs font-bold' },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`flex items-center gap-0.5 p-1.5 rounded-md transition-colors ${hoverBg} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        title="Heading"
      >
        <Heading size={16} color={iconColor} />
        <ChevronDown size={10} color={iconColor} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 py-1 rounded-md shadow-lg border z-50 min-w-[140px] ${menuBg}`}>
          {headings.map(h => (
            <div
              key={h.level}
              className={`px-3 py-1.5 cursor-pointer ${menuItemHover} ${h.size}`}
              onClick={() => { onSelect(h.level); setOpen(false); }}
            >
              {h.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
