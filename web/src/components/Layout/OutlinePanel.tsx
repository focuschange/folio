import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { parseOutline } from '../../utils/outlineParser';
import { getMonacoEditorRef } from './Toolbar';
import {
  Hash, Braces, Box, Code2, Variable, Layers, ListTree,
} from 'lucide-react';
import type { OutlineSymbol } from '../../types';

function jumpToLine(line: number) {
  const editor = getMonacoEditorRef();
  if (editor) {
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
  }
}

const kindIcons: Record<string, React.ReactNode> = {
  heading: <Hash size={12} className="text-blue-400" />,
  function: <Braces size={12} className="text-yellow-400" />,
  class: <Box size={12} className="text-orange-400" />,
  interface: <Layers size={12} className="text-green-400" />,
  method: <Code2 size={12} className="text-cyan-400" />,
  variable: <Variable size={12} className="text-purple-400" />,
  enum: <ListTree size={12} className="text-pink-400" />,
};

// Flatten nested symbols into a single array (parent first, then children).
// Used to determine the active item by line — children with children are rare
// for outlines today but we handle them defensively.
function flattenSymbols(symbols: OutlineSymbol[]): OutlineSymbol[] {
  const result: OutlineSymbol[] = [];
  for (const s of symbols) {
    result.push(s);
    if (s.children && s.children.length > 0) {
      result.push(...flattenSymbols(s.children));
    }
  }
  return result;
}

function SymbolItem({
  symbol,
  theme,
  isActive,
  itemRef,
  onClick,
}: {
  symbol: OutlineSymbol;
  theme: string;
  isActive: boolean;
  itemRef: React.Ref<HTMLDivElement> | null;
  onClick: (line: number) => void;
}) {
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const text = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';
  const activeBg = theme === 'dark' ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700';
  const activeBorder = theme === 'dark' ? 'border-l-2 border-blue-400' : 'border-l-2 border-blue-500';

  return (
    <div
      ref={itemRef ?? undefined}
      className={`flex items-center gap-2 px-3 py-1 cursor-pointer text-xs transition-colors ${
        isActive ? `${activeBg} ${activeBorder}` : `${hoverBg} ${text}`
      }`}
      style={isActive ? { paddingLeft: '10px' } : undefined}
      onClick={() => onClick(symbol.line)}
      title={`Line ${symbol.line}`}
    >
      {kindIcons[symbol.kind] || <Code2 size={12} />}
      <span className="truncate flex-1">{symbol.name}</span>
      <span className={`text-[10px] ${isActive ? 'opacity-60' : textMuted}`}>{symbol.line}</span>
    </div>
  );
}

export function OutlinePanel() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const content = activeTab?.content ?? '';
  const language = activeTab?.language ?? '';

  const symbols = useMemo(() => parseOutline(content, language), [content, language]);
  const flatSymbols = useMemo(() => flattenSymbols(symbols), [symbols]);

  // ---- Current position tracking (mirrors TocPanel) ----------------------
  const [viewport, setViewport] = useState<{ start: number; end: number }>({ start: 1, end: 1 });
  const [clickedLine, setClickedLine] = useState<number | null>(null);
  const disposableRef = useRef<{ dispose: () => void } | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);
  // Intent-lock: when user clicks a symbol, ignore scroll/cursor updates for
  // ~400ms so the click wins over `revealLineInCenter`'s scroll animation.
  const programmaticUntilRef = useRef<number>(0);

  useEffect(() => {
    disposableRef.current?.dispose();
    disposableRef.current = null;
    setViewport({ start: 1, end: 1 });
    setClickedLine(null);

    let rafId: number;

    const tryAttach = () => {
      const editor = getMonacoEditorRef();
      if (!editor) {
        rafId = requestAnimationFrame(tryAttach);
        return;
      }

      const update = () => {
        if (Date.now() < programmaticUntilRef.current) return;
        const ranges = editor.getVisibleRanges();
        if (ranges.length > 0) {
          const r = ranges[0];
          setViewport({ start: r.startLineNumber, end: r.endLineNumber });
        }
      };

      const cursorDisposable = editor.onDidChangeCursorPosition(update);
      const scrollDisposable = editor.onDidScrollChange(update);
      disposableRef.current = {
        dispose: () => { cursorDisposable.dispose(); scrollDisposable.dispose(); },
      };
      update();
    };

    rafId = requestAnimationFrame(tryAttach);

    return () => {
      cancelAnimationFrame(rafId);
      disposableRef.current?.dispose();
      disposableRef.current = null;
    };
  }, [activeTabId]);

  const handleClick = (line: number) => {
    programmaticUntilRef.current = Date.now() + 400;
    setClickedLine(line);
    window.setTimeout(() => setClickedLine(null), 450);
    jumpToLine(line);
  };

  // Rule (mirrors TocPanel):
  //  1) Clicked line wins during intent-lock.
  //  2) If any symbol falls within viewport [start, end], activate the
  //     topmost (smallest line) such symbol.
  //  3) Otherwise activate the last symbol with line <= viewport.start.
  const activeIdx = useMemo(() => {
    if (flatSymbols.length === 0) return -1;
    if (clickedLine != null) {
      const i = flatSymbols.findIndex(s => s.line === clickedLine);
      if (i >= 0) return i;
    }
    // Rule 1: topmost symbol inside viewport (smallest line).
    let insideIdx = -1;
    let insideLine = Number.POSITIVE_INFINITY;
    for (let i = 0; i < flatSymbols.length; i++) {
      const ln = flatSymbols[i].line;
      if (ln >= viewport.start && ln <= viewport.end && ln < insideLine) {
        insideLine = ln;
        insideIdx = i;
      }
    }
    if (insideIdx >= 0) return insideIdx;
    // Rule 2: last symbol before viewport (largest line <= viewport.start).
    let idx = -1;
    let bestLine = -1;
    for (let i = 0; i < flatSymbols.length; i++) {
      const ln = flatSymbols[i].line;
      if (ln <= viewport.start && ln > bestLine) {
        bestLine = ln;
        idx = i;
      }
    }
    return idx;
  }, [flatSymbols, viewport, clickedLine]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIdx]);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

  if (!activeTab) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${textMuted}`}>
        No file selected
      </div>
    );
  }

  if (flatSymbols.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${textMuted}`}>
        No symbols found
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {flatSymbols.map((symbol, i) => {
        const isActive = i === activeIdx;
        return (
          <SymbolItem
            key={`${symbol.name}-${symbol.line}-${i}`}
            symbol={symbol}
            theme={theme}
            isActive={isActive}
            itemRef={isActive ? activeItemRef : null}
            onClick={handleClick}
          />
        );
      })}
    </div>
  );
}
