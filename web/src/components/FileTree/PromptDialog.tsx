import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface PromptDialogProps {
  open: boolean;
  title: string;
  defaultValue?: string;
  /** Optional placeholder for the input field */
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

// Native `window.prompt` does not display in Tauri's WKWebView (the call returns
// `null` immediately), so we provide a small in-app modal instead. Used by file/dir
// rename and create operations from the FileTree context menu.
export function PromptDialog({
  open, title, defaultValue = '', placeholder, confirmLabel = '확인', cancelLabel = '취소',
  onConfirm, onCancel,
}: PromptDialogProps) {
  const theme = useAppStore(s => s.settings.theme);
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    // Auto-focus the input + select all on open
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const dark = theme === 'dark';
  const overlayCls = 'fixed inset-0 z-[200] bg-black/50 flex items-center justify-center';
  const dialogCls = `min-w-[360px] max-w-[480px] rounded-lg shadow-xl border p-4 ${
    dark ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
  }`;
  const inputCls = `w-full mt-2 px-2 py-1.5 rounded border outline-none text-sm ${
    dark
      ? 'bg-zinc-900 border-zinc-600 text-zinc-100 focus:border-blue-500'
      : 'bg-white border-zinc-300 text-zinc-800 focus:border-blue-500'
  }`;
  const btnPrimary = `px-3 py-1 rounded text-xs font-semibold ${
    dark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
  }`;
  const btnSecondary = `px-3 py-1 rounded text-xs ${
    dark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
  }`;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className={overlayCls} onClick={onCancel}>
      <div className={dialogCls} onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold">{title}</div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          className={inputCls}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={onCancel} className={btnSecondary}>{cancelLabel}</button>
          <button type="button" onClick={submit} className={btnPrimary}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
