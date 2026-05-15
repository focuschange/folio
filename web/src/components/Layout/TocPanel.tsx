import { useMemo, useEffect, useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMonacoEditorRef } from './Toolbar';
import { Hash } from 'lucide-react';

interface Heading {
  level: number;
  text: string;
  line: number;
}

function parseMarkdownHeadings(content: string): Heading[] {
  const lines = content.split('\n');
  const headings: Heading[] = [];
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) {
      headings.push({ level: m[1].length, text: m[2].trim(), line: i + 1 });
    }
  }
  return headings;
}

export function TocPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const activeTabId = useAppStore(s => s.activeTabId);
  const tabs = useAppStore(s => s.tabs);
  const activeTab = tabs.find(t => t.id === activeTabId);

  const headings = useMemo(() => {
    if (!activeTab || activeTab.language !== 'markdown') return [];
    return parseMarkdownHeadings(activeTab.content);
  }, [activeTab?.content, activeTab?.language]);

  // Viewport range — both start (top) and end (bottom) so we can pick
  // "first heading inside viewport, fallback to last heading before viewport".
  const [viewport, setViewport] = useState<{ start: number; end: number }>({ start: 1, end: 1 });
  // While intent-lock is held, force-activate this line regardless of viewport.
  const [clickedLine, setClickedLine] = useState<number | null>(null);
  const disposableRef = useRef<{ dispose: () => void } | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);
  // Intent-lock: when the user clicks a heading we want THAT heading active,
  // not whatever ends up at the viewport top after `revealLineInCenter` animates.
  // While the lock is held (~400ms after click), scroll/cursor updates are ignored.
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

  // Rule:
  //  1) If any headings fall within the viewport [start, end], activate the
  //     topmost one (matches user perception of "the section I'm reading").
  //  2) Otherwise (only body text visible), activate the last heading before
  //     viewport start — the section the body belongs to.
  //  3) `clickedLine` (set by handleClick) takes precedence during the
  //     intent-lock window so the clicked item wins over scroll updates.
  const activeIdx = useMemo(() => {
    if (headings.length === 0) return -1;
    if (clickedLine != null) {
      // exact-match on the clicked heading line
      const i = headings.findIndex(h => h.line === clickedLine);
      if (i >= 0) return i;
    }
    // Rule 1: first heading inside viewport
    const insideIdx = headings.findIndex(h => h.line >= viewport.start && h.line <= viewport.end);
    if (insideIdx >= 0) return insideIdx;
    // Rule 2: last heading before viewport start
    let idx = -1;
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].line <= viewport.start) idx = i;
      else break;
    }
    return idx;
  }, [headings, viewport, clickedLine]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIdx]);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const text = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';
  const activeBg = theme === 'dark' ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700';
  const activeBorder = theme === 'dark' ? 'border-l-2 border-blue-400' : 'border-l-2 border-blue-500';

  const handleClick = (line: number) => {
    // Lock scroll/cursor-driven updates briefly so the click intent wins
    // over the upcoming programmatic scroll from revealLineInCenter.
    programmaticUntilRef.current = Date.now() + 400;
    setClickedLine(line);
    // Release the click override after the lock — viewport-based rule resumes.
    window.setTimeout(() => setClickedLine(null), 450);
    const editor = getMonacoEditorRef();
    if (editor) {
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
    }
  };

  if (!activeTab) {
    return <div className={`p-4 text-xs ${textMuted}`}>No file selected</div>;
  }
  if (activeTab.language !== 'markdown') {
    return <div className={`p-4 text-xs ${textMuted}`}>Not a markdown file</div>;
  }
  if (headings.length === 0) {
    return <div className={`p-4 text-xs ${textMuted}`}>No headings found</div>;
  }

  return (
    <div className="h-full overflow-y-auto py-1">
      {headings.map((h, idx) => {
        const isActive = idx === activeIdx;
        return (
          <div
            key={idx}
            ref={isActive ? activeItemRef : null}
            onClick={() => handleClick(h.line)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs cursor-pointer transition-colors ${
              isActive ? `${activeBg} ${activeBorder}` : `${hoverBg} ${text}`
            }`}
            style={{ paddingLeft: `${(isActive ? 6 : 8) + (h.level - 1) * 12}px` }}
            title={`Line ${h.line}`}
          >
            <Hash size={10} className={`shrink-0 ${isActive ? 'opacity-80' : textMuted}`} />
            <span className="truncate font-medium">{h.text}</span>
            <span className={`ml-auto text-[10px] ${isActive ? 'opacity-60' : textMuted}`}>{h.line}</span>
          </div>
        );
      })}
    </div>
  );
}
