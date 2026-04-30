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

  const [currentLine, setCurrentLine] = useState(1);
  const disposableRef = useRef<{ dispose: () => void } | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const attach = () => {
      const editor = getMonacoEditorRef();
      if (!editor) return false;
      disposableRef.current?.dispose();

      const update = () => {
        const ranges = editor.getVisibleRanges();
        if (ranges.length > 0) setCurrentLine(ranges[0].startLineNumber);
      };

      const cursorDisposable = editor.onDidChangeCursorPosition(update);
      const scrollDisposable = editor.onDidScrollChange(update);
      disposableRef.current = {
        dispose: () => { cursorDisposable.dispose(); scrollDisposable.dispose(); },
      };
      update();
      return true;
    };

    if (!attach()) {
      const timer = setTimeout(attach, 500);
      return () => clearTimeout(timer);
    }
    return () => disposableRef.current?.dispose();
  }, [activeTabId]);

  const activeIdx = useMemo(() => {
    if (headings.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].line <= currentLine) idx = i;
      else break;
    }
    return idx;
  }, [headings, currentLine]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIdx]);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const text = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';
  const activeBg = theme === 'dark' ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700';
  const activeBorder = theme === 'dark' ? 'border-l-2 border-blue-400' : 'border-l-2 border-blue-500';

  const handleClick = (line: number) => {
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
