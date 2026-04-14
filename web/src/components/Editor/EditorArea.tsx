import { useAppStore } from '../../store/useAppStore';
import { EditorTabs } from './EditorTabs';
import { BreadcrumbBar } from './BreadcrumbBar';
import { MonacoWrapper } from './MonacoWrapper';
import { MarkdownPreview } from '../Markdown/MarkdownPreview';
import { isMarkdown } from '../../utils/languages';
import { FileText, FolderOpen } from 'lucide-react';
import { useFileSystem } from '../../hooks/useFileSystem';

export function EditorArea() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const { openFolder } = useFileSystem();

  const showMarkdownPreview = activeTab && isMarkdown(activeTab.path);

  if (!activeTab) {
    return (
      <div className={`h-full flex flex-col items-center justify-center gap-4 select-none ${
        theme === 'dark' ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-50 text-zinc-400'
      }`}>
        <FileText size={64} strokeWidth={1} className="opacity-30" />
        <div className="text-center">
          <p className="text-lg font-light mb-2">Folio</p>
          <p className="text-sm">Open a file to start editing</p>
        </div>
        <button
          onClick={openFolder}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
            theme === 'dark'
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
          }`}
        >
          <FolderOpen size={16} />
          Open Folder
        </button>
        <div className={`mt-8 text-xs ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <span>Open File</span><span className="text-right font-mono">Cmd+O</span>
            <span>Search</span><span className="text-right font-mono">Cmd+Shift+F</span>
            <span>Command Palette</span><span className="text-right font-mono">Cmd+Shift+P</span>
            <span>Toggle Terminal</span><span className="text-right font-mono">Cmd+`</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col overflow-hidden ${
      theme === 'dark' ? 'bg-zinc-800' : 'bg-white'
    }`}>
      <EditorTabs />
      <BreadcrumbBar />
      <div className="flex-1 min-h-0 flex">
        {showMarkdownPreview ? (
          <>
            <div className="flex-1 min-w-0">
              <MonacoWrapper tab={activeTab} />
            </div>
            <div className={`w-px ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            <div className="flex-1 min-w-0">
              <MarkdownPreview content={activeTab.content} />
            </div>
          </>
        ) : (
          <div className="flex-1 min-w-0">
            <MonacoWrapper tab={activeTab} />
          </div>
        )}
      </div>
    </div>
  );
}
