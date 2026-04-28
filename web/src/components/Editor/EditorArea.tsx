import { useState, useRef } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { useAppStore } from '../../store/useAppStore';
import { EditorTabs } from './EditorTabs';
import { BreadcrumbBar } from './BreadcrumbBar';
import { MonacoWrapper } from './MonacoWrapper';
import { MarkdownPreview } from '../Markdown/MarkdownPreview';
import { HtmlPreview } from '../Markdown/HtmlPreview';
import { isMarkdown, isHtml } from '../../utils/languages';
import { FileText, FolderOpen } from 'lucide-react';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useScrollSync } from '../../hooks/useScrollSync';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

export function EditorArea() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const previewVisible = useAppStore(s => s.previewVisible);
  const splitDirection = useAppStore(s => s.splitDirection);
  const splitTabId = useAppStore(s => s.splitTabId);
  const setSplitTab = useAppStore(s => s.setSplitTab);
  const scrollSync = useAppStore(s => s.settings.scrollSync);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const splitTab = splitTabId ? tabs.find(t => t.id === splitTabId) : null;
  const { openFolder } = useFileSystem();

  const showMarkdownPreview = activeTab && isMarkdown(activeTab.path) && previewVisible;
  const showHtmlPreview = activeTab && isHtml(activeTab.path) && previewVisible;
  const showPreview = showMarkdownPreview || showHtmlPreview;
  const isSplit = splitDirection !== 'none' && splitTab;

  // Scroll-sync wiring: only enabled when the markdown preview pane is visible
  // alongside the editor. State (not just ref) so the hook re-runs after mount.
  const [editorInstance, setEditorInstance] = useState<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  useScrollSync({
    editor: editorInstance,
    previewEl: previewContainerRef.current,
    enabled: !!showMarkdownPreview && scrollSync,
  });

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

  const handleResizeHandle = `w-[3px] ${theme === 'dark' ? 'bg-zinc-700 hover:bg-blue-500' : 'bg-zinc-200 hover:bg-blue-400'} transition-colors cursor-col-resize`;
  const handleResizeHandleH = `h-[3px] ${theme === 'dark' ? 'bg-zinc-700 hover:bg-blue-500' : 'bg-zinc-200 hover:bg-blue-400'} transition-colors cursor-row-resize`;

  const renderMainEditor = () => {
    if (showPreview) {
      return (
        <div className="h-full flex">
          <div className="flex-1 min-w-0">
            <MonacoWrapper tab={activeTab} onEditorMount={setEditorInstance} />
          </div>
          <div className={`w-px ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <div className="flex-1 min-w-0">
            {showMarkdownPreview && (
              <MarkdownPreview ref={previewContainerRef} content={activeTab.content} filePath={activeTab.path} />
            )}
            {showHtmlPreview && <HtmlPreview content={activeTab.content} />}
          </div>
        </div>
      );
    }
    return <MonacoWrapper tab={activeTab} />;
  };

  const renderSplitEditor = () => {
    if (!splitTab) return null;
    return (
      <div className="h-full flex flex-col">
        {/* Split pane tab selector */}
        <div className={`flex items-center gap-1 px-2 py-0.5 border-b shrink-0 ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-100 border-zinc-200'
        }`}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setSplitTab(t.id)}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors truncate max-w-[120px] ${
                t.id === splitTabId
                  ? (theme === 'dark' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-300 text-zinc-800')
                  : (theme === 'dark' ? 'text-zinc-500 hover:bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-200')
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0">
          <MonacoWrapper tab={splitTab} key={`split-${splitTab.id}`} />
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden ${
      theme === 'dark' ? 'bg-zinc-800' : 'bg-white'
    }`}>
      <EditorTabs />
      <BreadcrumbBar />
      <div className="flex-1 min-h-0">
        {isSplit ? (
          <PanelGroup orientation={splitDirection === 'vertical' ? 'vertical' : 'horizontal'}>
            <Panel defaultSize={50} minSize={20}>
              {renderMainEditor()}
            </Panel>
            <PanelResizeHandle className={splitDirection === 'vertical' ? handleResizeHandleH : handleResizeHandle} />
            <Panel defaultSize={50} minSize={20}>
              {renderSplitEditor()}
            </Panel>
          </PanelGroup>
        ) : (
          renderMainEditor()
        )}
      </div>
    </div>
  );
}
