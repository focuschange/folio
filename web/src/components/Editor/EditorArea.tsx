import { useState, useRef, useCallback } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { useAppStore } from '../../store/useAppStore';
import { EditorTabs } from './EditorTabs';
import { BreadcrumbBar } from './BreadcrumbBar';
import { MonacoWrapper } from './MonacoWrapper';
import { MarkdownPreview } from '../Markdown/MarkdownPreview';
import { HtmlPreview } from '../Markdown/HtmlPreview';
import { isMarkdown, isHtml } from '../../utils/languages';
import { FileText, FolderOpen, X } from 'lucide-react';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useScrollSync } from '../../hooks/useScrollSync';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { MarkdownToolbarRow } from '../Layout/Toolbar';
import { getMonacoEditorRef } from '../Layout/Toolbar';
import * as md from '../../utils/markdownActions';
import { ImageInsertDialog } from '../Markdown/ImageInsertDialog';
import { HtmlEditorToolbar } from './HtmlEditorToolbar';

export function EditorArea() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const previewVisible = useAppStore(s => s.previewVisible);
  const togglePreview = useAppStore(s => s.togglePreview);
  const splitDirection = useAppStore(s => s.splitDirection);
  const splitTabId = useAppStore(s => s.splitTabId);
  const setSplitTab = useAppStore(s => s.setSplitTab);
  const scrollSync = useAppStore(s => s.settings.scrollSync);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const splitTab = splitTabId ? tabs.find(t => t.id === splitTabId) : null;
  const { openFolder } = useFileSystem();

  // Treat a tab as markdown/html if either the path extension matches OR the
  // explicit `language` is set (covers Untitled tabs without an extension and
  // tabs whose language was changed manually via the status bar).
  const showMarkdownPreview = activeTab
    && (isMarkdown(activeTab.path) || activeTab.language === 'markdown')
    && previewVisible;
  const showHtmlPreview = activeTab
    && (isHtml(activeTab.path) || activeTab.language === 'html')
    && previewVisible;
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
        <PreviewSplitView
          theme={theme}
          editor={<MonacoWrapper tab={activeTab} onEditorMount={setEditorInstance} />}
          preview={
            <>
              {showMarkdownPreview && (
                <MarkdownPreview ref={previewContainerRef} content={activeTab.content} filePath={activeTab.path} />
              )}
              {showHtmlPreview && <HtmlPreview content={activeTab.content} />}
            </>
          }
          onClose={togglePreview}
        />
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

  const isMarkdownTab = activeTab
    ? (isMarkdown(activeTab.path) || activeTab.language === 'markdown')
    : false;

  const isHtmlTab = activeTab
    ? (isHtml(activeTab.path) || activeTab.language === 'html')
    : false;

  return (
    <div className={`h-full flex flex-col overflow-hidden ${
      theme === 'dark' ? 'bg-zinc-800' : 'bg-white'
    }`}>
      <EditorTabs />
      <BreadcrumbBar />
      {isMarkdownTab && activeTab && (
        <MarkdownEditorToolbar theme={theme} activeTab={!!activeTab} />
      )}
      {isHtmlTab && activeTab && (
        <HtmlEditorToolbar
          theme={theme}
          activeTab={!!activeTab}
          previewVisible={previewVisible}
          onTogglePreview={togglePreview}
        />
      )}
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

/**
 * Markdown-specific formatting toolbar rendered inside the editor pane,
 * just below BreadcrumbBar. All handlers operate on the shared Monaco editor ref.
 */
function MarkdownEditorToolbar({ theme, activeTab }: { theme: string; activeTab: boolean }) {
  const previewVisible = useAppStore(s => s.previewVisible);
  const togglePreview = useAppStore(s => s.togglePreview);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const iconSize = 15;
  const iconColor = theme === 'dark' ? '#a1a1aa' : '#52525b';
  const borderCls = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const bgCls = theme === 'dark' ? 'bg-zinc-800' : 'bg-white';

  const handleHeading = useCallback((level: number) => {
    const e = getMonacoEditorRef(); if (e) md.setHeading(e, level);
  }, []);
  const handleBold = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.wrapSelection(e, '**', '**'); }, []);
  const handleItalic = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.wrapSelection(e, '*', '*'); }, []);
  const handleStrikethrough = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.wrapSelection(e, '~~', '~~'); }, []);
  const handleInlineCode = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.wrapSelection(e, '`', '`'); }, []);
  const handleBulletList = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.prefixLines(e, '- '); }, []);
  const handleNumberedList = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.prefixLines(e, '1. '); }, []);
  const handleTaskList = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.prefixLines(e, '- [ ] '); }, []);
  const handleQuote = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.prefixLines(e, '> '); }, []);
  const handleLink = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.insertLink(e); }, []);
  const handleImage = useCallback(() => setImageDialogOpen(true), []);
  const handleImageInsert = useCallback((result: { url: string; alt: string; width?: number; height?: number }) => {
    const e = getMonacoEditorRef(); if (!e) return;
    const { url, alt, width, height } = result;
    if (width || height) {
      const attrs = [width ? `width="${width}"` : '', height ? `height="${height}"` : ''].filter(Boolean).join(' ');
      md.insertAtCursor(e, `<img src="${url}" alt="${alt || ''}" ${attrs} />`);
    } else {
      md.insertAtCursor(e, `![${alt || 'image'}](${url})`);
    }
  }, []);
  const handleInsertTable = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.insertTable(e); }, []);
  const handleCodeBlock = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.insertCodeBlock(e, ''); }, []);
  const handleHorizontalRule = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.insertHorizontalRule(e); }, []);
  const handleMathBlock = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.insertMathBlock(e); }, []);
  const handleMermaid = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.insertMermaid(e); }, []);
  const handleFootnote = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.insertFootnote(e); }, []);
  const handleIndent = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.indent(e); }, []);
  const handleOutdent = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.outdent(e); }, []);
  const handleInsertTOC = useCallback(() => { const e = getMonacoEditorRef(); if (e) md.insertTOC(e); }, []);

  return (
    <>
      <MarkdownToolbarRow
        activeTab={activeTab}
        iconSize={iconSize}
        iconColor={iconColor}
        borderCls={borderCls}
        bgCls={bgCls}
        previewVisible={previewVisible}
        onHeading={handleHeading}
        handlers={{
          handleBold, handleItalic, handleStrikethrough, handleInlineCode,
          handleBulletList, handleNumberedList, handleTaskList, handleQuote,
          handleLink, handleImage, handleInsertTable, togglePreview,
          handleCodeBlock, handleHorizontalRule, handleMathBlock, handleMermaid,
          handleFootnote, handleIndent, handleOutdent, handleInsertTOC,
        }}
      />
      <ImageInsertDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onInsert={handleImageInsert}
      />
    </>
  );
}

/**
 * Editor + Markdown/HTML preview side-by-side with a draggable divider.
 *
 * Implementation note: we deliberately use flexbox + a controlled `editorPct`
 * width (not react-resizable-panels) because Monaco's automaticLayout depends
 * on the container being a real flex item that gets a real pixel size on mount.
 * Wrapping it in a virtualized panel manager caused Monaco to render at near-zero
 * width on first paint until something nudged it to relayout.
 */
function PreviewSplitView({
  editor, preview, onClose, theme,
}: {
  editor: React.ReactNode;
  preview: React.ReactNode;
  onClose: () => void;
  theme: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editorPct, setEditorPct] = useState<number>(() => {
    const saved = Number(localStorage.getItem('folio-preview-split-pct'));
    return Number.isFinite(saved) && saved >= 20 && saved <= 80 ? saved : 50;
  });
  const draggingRef = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, pct));
      setEditorPct(clamped);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      // Persist the chosen ratio
      try { localStorage.setItem('folio-preview-split-pct', String(editorPctRef.current)); } catch { /* ignore */ }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Keep latest pct accessible to the mouseup closure
  const editorPctRef = useRef(editorPct);
  editorPctRef.current = editorPct;

  const dividerColor = theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200';
  const dividerHover = theme === 'dark' ? 'hover:bg-blue-500' : 'hover:bg-blue-400';

  return (
    <div ref={containerRef} className="h-full w-full flex">
      <div className="h-full min-w-0 overflow-hidden" style={{ width: `${editorPct}%` }}>
        {editor}
      </div>
      <div
        onMouseDown={onMouseDown}
        className={`w-[3px] cursor-col-resize transition-colors ${dividerColor} ${dividerHover}`}
        title="드래그해서 크기 조절"
      />
      <div className="h-full min-w-0 flex-1 relative">
        <button
          onClick={onClose}
          title="프리뷰 닫기 (⌘⇧V)"
          className={`absolute top-2 right-2 z-10 p-1 rounded transition-colors ${
            theme === 'dark'
              ? 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              : 'bg-white/80 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
          }`}
        >
          <X size={14} />
        </button>
        <div className="h-full w-full">{preview}</div>
      </div>
    </div>
  );
}
