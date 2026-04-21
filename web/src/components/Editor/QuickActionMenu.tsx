// ⌘. Quick Action floating menu — shown near the selection, offers the
// preset AI edits defined in quickActions.ts. Selecting an entry kicks off
// startInlineEdit with the preset filled in and auto-submitted.

import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { QUICK_ACTIONS, type QuickAction } from './quickActions';
import { startInlineEdit } from './inlineEdit';

type Editor = monaco.editor.ICodeEditor;

interface OpenParams {
  editor: Editor;
  theme: 'dark' | 'light';
  language: string;
}

let activeMenu: { host: HTMLElement; root: Root; cleanup: () => void } | null = null;

export function openQuickActionMenu(params: OpenParams): void {
  // Dismiss any previous menu
  closeQuickActionMenu();

  const { editor } = params;
  const model = editor.getModel();
  if (!model) return;

  // Position the menu near the end of the selection (or cursor)
  const sel = editor.getSelection();
  const pos = sel && !sel.isEmpty()
    ? { lineNumber: sel.endLineNumber, column: sel.endColumn }
    : editor.getPosition() ?? { lineNumber: 1, column: 1 };

  const coords = editor.getScrolledVisiblePosition(pos);
  const container = editor.getDomNode();
  if (!coords || !container) return;

  const host = document.createElement('div');
  host.style.position = 'absolute';
  host.style.left = `${Math.max(8, coords.left)}px`;
  host.style.top = `${coords.top + coords.height + 2}px`;
  host.style.zIndex = '50';
  container.appendChild(host);

  const root = createRoot(host);

  const dismiss = () => closeQuickActionMenu();

  const onChosen = (action: QuickAction) => {
    dismiss();
    startInlineEdit({
      editor,
      model,
      theme: params.theme,
      language: params.language,
      presetInstruction: action.preset,
      autoSubmit: true,
    });
  };

  // Dismiss on outside click / editor focus loss
  const onDocClick = (e: MouseEvent) => {
    if (!host.contains(e.target as Node)) dismiss();
  };
  // Defer so the triggering keybinding doesn't immediately dismiss
  const docClickTimer = setTimeout(() => {
    document.addEventListener('mousedown', onDocClick, true);
  }, 50);

  const cleanup = () => {
    clearTimeout(docClickTimer);
    document.removeEventListener('mousedown', onDocClick, true);
    try { root.unmount(); } catch { /* ignore */ }
    host.remove();
  };

  activeMenu = { host, root, cleanup };

  root.render(
    <QuickActionMenu
      theme={params.theme}
      onChoose={onChosen}
      onCancel={dismiss}
    />
  );
}

export function closeQuickActionMenu(): void {
  if (activeMenu) {
    activeMenu.cleanup();
    activeMenu = null;
  }
}

function QuickActionMenu({
  theme, onChoose, onCancel,
}: {
  theme: 'dark' | 'light';
  onChoose: (action: QuickAction) => void;
  onCancel: () => void;
}) {
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex(i => (i + 1) % QUICK_ACTIONS.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(i => (i - 1 + QUICK_ACTIONS.length) % QUICK_ACTIONS.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onChoose(QUICK_ACTIONS[index]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (/^[1-9]$/.test(e.key)) {
      const n = parseInt(e.key, 10);
      const action = QUICK_ACTIONS.find(a => a.accelerator === String(n));
      if (action) {
        e.preventDefault();
        onChoose(action);
      }
    }
  };

  const bg = theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300';
  const hoverBg = theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100';
  const muted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const accentFg = 'text-blue-400';

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKey}
      className={`w-56 rounded border shadow-xl outline-none ${bg}`}
    >
      <div className={`px-2 py-1 text-[10px] uppercase tracking-wider ${muted}`}>
        Quick Actions
      </div>
      {QUICK_ACTIONS.map((action, i) => (
        <button
          key={action.id}
          type="button"
          onMouseEnter={() => setIndex(i)}
          onClick={() => onChoose(action)}
          className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 ${
            i === index ? hoverBg : ''
          }`}
        >
          <span className={`font-mono text-[10px] w-4 ${accentFg}`}>
            {action.accelerator ?? ''}
          </span>
          <span className="flex-1">
            <span className="font-medium">{action.label}</span>
            <span className={`ml-2 ${muted}`}>— {action.hint}</span>
          </span>
        </button>
      ))}
      <div className={`px-2 py-1 border-t border-white/5 text-[10px] ${muted}`}>
        ↑/↓ 이동 · ⏎ 선택 · Esc 취소
      </div>
    </div>
  );
}
