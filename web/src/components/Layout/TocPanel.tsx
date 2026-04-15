import { useMemo } from 'react';
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
    // Skip fenced code blocks
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

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const text = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';

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
      {headings.map((h, idx) => (
        <div
          key={idx}
          onClick={() => handleClick(h.line)}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs cursor-pointer ${hoverBg} ${text}`}
          style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
          title={`Line ${h.line}`}
        >
          <Hash size={10} className={`shrink-0 ${textMuted}`} />
          <span className="truncate">{h.text}</span>
          <span className={`ml-auto text-[10px] ${textMuted}`}>{h.line}</span>
        </div>
      ))}
    </div>
  );
}
