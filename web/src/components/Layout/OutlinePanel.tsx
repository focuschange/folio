import { useMemo } from 'react';
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

function SymbolItem({ symbol, theme }: { symbol: OutlineSymbol; theme: string }) {
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 cursor-pointer text-xs ${hoverBg}`}
      onClick={() => jumpToLine(symbol.line)}
    >
      {kindIcons[symbol.kind] || <Code2 size={12} />}
      <span className="truncate flex-1">{symbol.name}</span>
      <span className={`text-[10px] ${textMuted}`}>{symbol.line}</span>
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

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

  if (!activeTab) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${textMuted}`}>
        No file selected
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${textMuted}`}>
        No symbols found
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {symbols.map((symbol, i) => (
        <SymbolItem key={`${symbol.name}-${symbol.line}-${i}`} symbol={symbol} theme={theme} />
      ))}
    </div>
  );
}
