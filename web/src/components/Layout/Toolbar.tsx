import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  FilePlus, FolderOpen, Save, FileDown,
  Undo2, Redo2, Scissors, Copy, Clipboard,
  Search, FolderSearch,
  PanelLeft, PanelRight, List, Maximize2,
  Bold, Italic, Strikethrough, Code2,
  ListOrdered, ListChecks,
  Quote, Link2, Image as ImageIcon, Table2,
  GitBranch,
  Settings,
  Sun, Moon,
  Terminal,
  Wand2, WandSparkles,
  Code, Minus, Sigma, GitGraph, FileText, IndentIncrease, IndentDecrease,
  Eye, EyeOff,
} from 'lucide-react';
import { isFormatSupported } from '../../utils/formatter';
import * as md from '../../utils/markdownActions';
import { HeadingDropdown } from './HeadingDropdown';
import { MoreMenuDropdown, type MoreMenuItem } from './MoreMenuDropdown';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../hooks/useTheme';
import { useFileSystem } from '../../hooks/useFileSystem';

// Global reference to Monaco editor instance for toolbar actions
let monacoEditorRef: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;

export function setMonacoEditorRef(editor: import('monaco-editor').editor.IStandaloneCodeEditor | null) {
  monacoEditorRef = editor;
}

export function getMonacoEditorRef(): import('monaco-editor').editor.IStandaloneCodeEditor | null {
  return monacoEditorRef;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ToolbarButton({ icon, tooltip, onClick, active, disabled }: ToolbarButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const theme = useAppStore(s => s.settings.theme);
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200';
  const activeBg = active ? (theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200') : '';

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={disabled}
        className={`p-1.5 rounded-md transition-colors ${hoverBg} ${activeBg} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        {icon}
      </button>
      {showTooltip && (
        <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-xs rounded shadow-lg whitespace-nowrap z-50 ${
          theme === 'dark' ? 'bg-zinc-800 text-zinc-200 border border-zinc-600' : 'bg-white text-zinc-800 border border-zinc-300'
        }`}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

function Separator() {
  const theme = useAppStore(s => s.settings.theme);
  return <div className={`w-px h-5 mx-1 ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'}`} />;
}

export function Toolbar() {
  const theme = useAppStore(s => s.settings.theme);
  const { toggleTheme } = useTheme();
  // Use individual selectors — subscribing to the whole store via useAppStore() would re-render on every state change
  const toggleSidebar = useAppStore(s => s.toggleSidebar);
  const toggleRightPanel = useAppStore(s => s.toggleRightPanel);
  const toggleSearch = useAppStore(s => s.toggleSearch);
  const toggleGitPanel = useAppStore(s => s.toggleGitPanel);
  const toggleTerminal = useAppStore(s => s.toggleTerminal);
  const toggleZenMode = useAppStore(s => s.toggleZenMode);
  const toggleSettings = useAppStore(s => s.toggleSettings);
  const toggleOutline = useAppStore(s => s.toggleOutline);
  const sidebarVisible = useAppStore(s => s.sidebarVisible);
  const terminalVisible = useAppStore(s => s.terminalVisible);
  const activeRightTab = useAppStore(s => s.activeRightTab);
  const rightPanelVisible = useAppStore(s => s.rightPanelVisible);
  const activeTabId = useAppStore(s => s.activeTabId);
  const tabs = useAppStore(s => s.tabs);
  const openTab = useAppStore(s => s.openTab);
  const previewVisible = useAppStore(s => s.previewVisible);
  const togglePreview = useAppStore(s => s.togglePreview);
  const { openFolder, writeFile } = useFileSystem();
  const iconSize = 16;
  const iconColor = theme === 'dark' ? '#a1a1aa' : '#52525b';

  const activeTab = tabs.find(t => t.id === activeTabId);
  const isMarkdown = activeTab?.language === 'markdown';

  // --- Action handlers ---

  const handleNewFile = useCallback(() => {
    const id = `untitled-${Date.now()}`;
    openTab(id, 'Untitled', '');
  }, [openTab]);

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    const content = monacoEditorRef?.getValue() ?? activeTab.content;
    const store = useAppStore.getState();
    store.updateTabContent(activeTab.id, content);

    let savePath = activeTab.path;
    if (savePath.startsWith('untitled-')) {
      // Untitled — show Save As dialog
      if ('__TAURI_INTERNALS__' in window) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const selected = await invoke<string | null>('save_file_dialog', {
            defaultName: activeTab.name === 'Untitled' ? 'untitled.txt' : activeTab.name,
          });
          if (!selected) return;
          savePath = selected;
          const newName = selected.split('/').pop() ?? activeTab.name;
          const ext = newName.includes('.') ? newName.split('.').pop()?.toLowerCase() : '';
          const langMap: Record<string, string> = {
            js: 'javascript', ts: 'typescript', json: 'json', md: 'markdown',
            html: 'html', css: 'css', py: 'python', java: 'java', go: 'go',
            rs: 'rust', sql: 'sql', yaml: 'yaml', yml: 'yaml',
          };
          const newLang = (ext && langMap[ext]) || 'plaintext';
          useAppStore.setState(state => ({
            tabs: state.tabs.map(t => t.id === activeTab.id
              ? { ...t, path: savePath, name: newName, language: newLang, dirty: false }
              : t),
          }));
        } catch (e) {
          console.error('save dialog error:', e);
          return;
        }
      } else {
        return;
      }
    }

    const success = await writeFile(savePath, content);
    if (success) {
      useAppStore.getState().markTabClean(activeTab.id);
    }
  }, [activeTab, writeFile]);

  const handleSaveAs = useCallback(async () => {
    if (!activeTab) return;
    if (!('__TAURI_INTERNALS__' in window)) return;
    const content = monacoEditorRef?.getValue() ?? activeTab.content;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // Default name: current filename (or untitled.txt for new files)
      const defaultName = activeTab.path.startsWith('untitled-')
        ? (activeTab.name === 'Untitled' ? 'untitled.txt' : activeTab.name)
        : activeTab.name;
      const selected = await invoke<string | null>('save_file_dialog', { defaultName });
      if (!selected) return; // cancelled

      const newName = selected.split('/').pop() ?? activeTab.name;
      const ext = newName.includes('.') ? newName.split('.').pop()?.toLowerCase() : '';
      const langMap: Record<string, string> = {
        js: 'javascript', ts: 'typescript', json: 'json', md: 'markdown',
        html: 'html', css: 'css', py: 'python', java: 'java', go: 'go',
        rs: 'rust', sql: 'sql', yaml: 'yaml', yml: 'yaml',
      };
      const newLang = (ext && langMap[ext]) || activeTab.language;

      const success = await writeFile(selected, content);
      if (success) {
        // Update tab to point to the new file
        useAppStore.setState(state => ({
          tabs: state.tabs.map(t => t.id === activeTab.id
            ? { ...t, path: selected, name: newName, language: newLang, dirty: false }
            : t),
        }));
      }
    } catch (e) {
      console.error('Save As error:', e);
    }
  }, [activeTab, writeFile]);

  const handleUndo = useCallback(() => {
    monacoEditorRef?.trigger('toolbar', 'undo', null);
  }, []);

  const handleRedo = useCallback(() => {
    monacoEditorRef?.trigger('toolbar', 'redo', null);
  }, []);

  const handleCut = useCallback(() => {
    monacoEditorRef?.focus();
    document.execCommand('cut');
  }, []);

  const handleCopy = useCallback(() => {
    monacoEditorRef?.focus();
    document.execCommand('copy');
  }, []);

  const handlePaste = useCallback(() => {
    monacoEditorRef?.focus();
    document.execCommand('paste');
  }, []);

  const handleFind = useCallback(() => {
    monacoEditorRef?.trigger('toolbar', 'actions.find', null);
  }, []);

  // Markdown action wrappers (use shared markdownActions utility)
  const md_ = useCallback(<T extends unknown[]>(fn: (editor: NonNullable<typeof monacoEditorRef>, ...args: T) => void) => {
    return (...args: T) => {
      if (!monacoEditorRef) return;
      fn(monacoEditorRef, ...args);
    };
  }, []);

  const handleBold = useCallback(() => { if (monacoEditorRef) md.wrapSelection(monacoEditorRef, '**', '**'); }, []);
  const handleItalic = useCallback(() => { if (monacoEditorRef) md.wrapSelection(monacoEditorRef, '*', '*'); }, []);
  const handleStrikethrough = useCallback(() => { if (monacoEditorRef) md.wrapSelection(monacoEditorRef, '~~', '~~'); }, []);
  const handleInlineCode = useCallback(() => { if (monacoEditorRef) md.wrapSelection(monacoEditorRef, '`', '`'); }, []);
  const handleHeading = useCallback((level: number) => { if (monacoEditorRef) md.setHeading(monacoEditorRef, level); }, []);
  const handleBulletList = useCallback(() => { if (monacoEditorRef) md.prefixLines(monacoEditorRef, '- '); }, []);
  const handleNumberedList = useCallback(() => { if (monacoEditorRef) md.prefixLines(monacoEditorRef, '1. '); }, []);
  const handleTaskList = useCallback(() => { if (monacoEditorRef) md.prefixLines(monacoEditorRef, '- [ ] '); }, []);
  const handleQuote = useCallback(() => { if (monacoEditorRef) md.prefixLines(monacoEditorRef, '> '); }, []);
  const handleLink = useCallback(() => { if (monacoEditorRef) md.insertLink(monacoEditorRef); }, []);
  const handleImage = useCallback(() => { if (monacoEditorRef) md.insertImage(monacoEditorRef); }, []);
  const handleCodeBlock = useCallback(() => { if (monacoEditorRef) md.insertCodeBlock(monacoEditorRef, ''); }, []);
  const handleHorizontalRule = useCallback(() => { if (monacoEditorRef) md.insertHorizontalRule(monacoEditorRef); }, []);
  const handleMathBlock = useCallback(() => { if (monacoEditorRef) md.insertMathBlock(monacoEditorRef); }, []);
  const handleMermaid = useCallback(() => { if (monacoEditorRef) md.insertMermaid(monacoEditorRef); }, []);
  const handleFootnote = useCallback(() => { if (monacoEditorRef) md.insertFootnote(monacoEditorRef); }, []);
  const handleIndent = useCallback(() => { if (monacoEditorRef) md.indent(monacoEditorRef); }, []);
  const handleOutdent = useCallback(() => { if (monacoEditorRef) md.outdent(monacoEditorRef); }, []);
  const handleInsertTOC = useCallback(() => { if (monacoEditorRef) md.insertTOC(monacoEditorRef); }, []);
  // Suppress unused warning
  void md_;

  const handleFormatDocument = useCallback(async () => {
    if (!monacoEditorRef || !activeTab) return;
    const { formatCode } = await import('../../utils/formatter');
    if (isFormatSupported(activeTab.language)) {
      const result = await formatCode(monacoEditorRef.getValue(), activeTab.language);
      if (result.formatted) {
        const model = monacoEditorRef.getModel();
        if (model) {
          monacoEditorRef.executeEdits('format-document', [{
            range: model.getFullModelRange(),
            text: result.code,
          }]);
        }
      }
    } else {
      monacoEditorRef.focus();
      monacoEditorRef.trigger('toolbar', 'editor.action.formatDocument', null);
    }
  }, [activeTab]);

  const handleFormatSelection = useCallback(async () => {
    if (!monacoEditorRef || !activeTab) return;
    const { formatSelection, formatCode } = await import('../../utils/formatter');
    const sel = monacoEditorRef.getSelection();
    const model = monacoEditorRef.getModel();
    if (!sel || !model) return;

    if (sel.isEmpty()) {
      // No selection — format full document
      if (isFormatSupported(activeTab.language)) {
        const result = await formatCode(monacoEditorRef.getValue(), activeTab.language);
        if (result.formatted) {
          monacoEditorRef.executeEdits('format-document', [{
            range: model.getFullModelRange(),
            text: result.code,
          }]);
        }
      }
      return;
    }

    const selectedText = model.getValueInRange(sel);
    if (isFormatSupported(activeTab.language)) {
      const result = await formatSelection(selectedText, activeTab.language);
      if (result.formatted) {
        monacoEditorRef.executeEdits('format-selection', [{
          range: sel,
          text: result.code,
        }]);
      }
    } else {
      monacoEditorRef.focus();
      monacoEditorRef.trigger('toolbar', 'editor.action.formatSelection', null);
    }
  }, [activeTab]);

  const handleInsertTable = useCallback(() => { if (monacoEditorRef) md.insertTable(monacoEditorRef); }, []);

  // Split toolbar into two rows when editing markdown:
  //  Row 1 — File / Edit / Search / View / Format / Git / Theme / Settings (always)
  //  Row 2 — Markdown-specific buttons (only when current tab is markdown)
  const rowBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-50';
  const rowBorder = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const row2Bg = theme === 'dark' ? 'bg-zinc-900/60' : 'bg-zinc-100';

  return (
    <div className={`flex flex-col select-none shrink-0 border-b ${rowBg} ${rowBorder}`}>
      {/* Row 1: non-markdown toolbar (always visible) */}
      <div className="flex items-center px-2 py-1 gap-0.5">
        {/* File */}
        <ToolbarButton icon={<FilePlus size={iconSize} color={iconColor} />} tooltip="New File" onClick={handleNewFile} />
        <ToolbarButton icon={<FolderOpen size={iconSize} color={iconColor} />} tooltip="Open Folder" onClick={openFolder} />
        <ToolbarButton icon={<Save size={iconSize} color={iconColor} />} tooltip="Save (⌘S)" onClick={handleSave} disabled={!activeTab} />
        <ToolbarButton icon={<FileDown size={iconSize} color={iconColor} />} tooltip="Save As... (⌘⇧S)" onClick={handleSaveAs} disabled={!activeTab} />

        <Separator />

        {/* Edit */}
        <ToolbarButton icon={<Undo2 size={iconSize} color={iconColor} />} tooltip="Undo (⌘Z)" onClick={handleUndo} disabled={!activeTab} />
        <ToolbarButton icon={<Redo2 size={iconSize} color={iconColor} />} tooltip="Redo (⌘⇧Z)" onClick={handleRedo} disabled={!activeTab} />
        <ToolbarButton icon={<Scissors size={iconSize} color={iconColor} />} tooltip="Cut (⌘X)" onClick={handleCut} disabled={!activeTab} />
        <ToolbarButton icon={<Copy size={iconSize} color={iconColor} />} tooltip="Copy (⌘C)" onClick={handleCopy} disabled={!activeTab} />
        <ToolbarButton icon={<Clipboard size={iconSize} color={iconColor} />} tooltip="Paste (⌘V)" onClick={handlePaste} disabled={!activeTab} />

        <Separator />

        {/* Search */}
        <ToolbarButton icon={<Search size={iconSize} color={iconColor} />} tooltip="Find (⌘F)" onClick={handleFind} disabled={!activeTab} />
        <ToolbarButton icon={<FolderSearch size={iconSize} color={iconColor} />} tooltip="Search in Project (⌘⇧F)" onClick={toggleSearch} />

        <Separator />

        {/* View */}
        <ToolbarButton icon={<PanelLeft size={iconSize} color={iconColor} />} tooltip="Toggle Sidebar (⌘B)" onClick={toggleSidebar} active={sidebarVisible} />
        <ToolbarButton icon={<PanelRight size={iconSize} color={iconColor} />} tooltip="Toggle Right Panel (⌘⌥B)" onClick={toggleRightPanel} active={rightPanelVisible} />
        <ToolbarButton icon={<List size={iconSize} color={iconColor} />} tooltip="Outline (⌘⇧O)" onClick={toggleOutline} active={rightPanelVisible && activeRightTab === 'outline'} />
        <ToolbarButton icon={<Terminal size={iconSize} color={iconColor} />} tooltip="Terminal (⌃`)" onClick={toggleTerminal} active={terminalVisible} />
        <ToolbarButton icon={<Maximize2 size={iconSize} color={iconColor} />} tooltip="Zen Mode (F11)" onClick={async () => {
          toggleZenMode();
          if ('__TAURI_INTERNALS__' in window) {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              const win = getCurrentWindow();
              const isFs = await win.isFullscreen();
              await win.setFullscreen(!isFs);
            } catch (e) { console.error(e); }
          }
        }} />

        <Separator />

        {/* Format */}
        <ToolbarButton icon={<Wand2 size={iconSize} color={iconColor} />} tooltip="Format Document (⇧⌥F)" onClick={handleFormatDocument} disabled={!activeTab} />
        <ToolbarButton icon={<WandSparkles size={iconSize} color={iconColor} />} tooltip="Format Selection (⌘⇧⌥F)" onClick={handleFormatSelection} disabled={!activeTab} />

        <Separator />

        {/* Git */}
        <ToolbarButton icon={<GitBranch size={iconSize} color={iconColor} />} tooltip="Git Panel" onClick={toggleGitPanel} active={rightPanelVisible && activeRightTab === 'git'} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <ToolbarButton
          icon={theme === 'dark' ? <Sun size={iconSize} color="#fbbf24" /> : <Moon size={iconSize} color="#6366f1" />}
          tooltip={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          onClick={toggleTheme}
        />
        <ToolbarButton icon={<Settings size={iconSize} color={iconColor} />} tooltip="Settings (⌘,)" onClick={toggleSettings} />
      </div>

      {/* Row 2: markdown-specific toolbar (only when editing a markdown file).
          Items auto-overflow into a "More" dropdown when the row is too narrow. */}
      {isMarkdown && (
        <MarkdownToolbarRow
          activeTab={!!activeTab}
          iconSize={iconSize}
          iconColor={iconColor}
          borderCls={rowBorder}
          bgCls={row2Bg}
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
      )}
    </div>
  );
}

// --- Markdown toolbar row with automatic overflow ---

interface MdHandlers {
  handleBold: () => void;
  handleItalic: () => void;
  handleStrikethrough: () => void;
  handleInlineCode: () => void;
  handleBulletList: () => void;
  handleNumberedList: () => void;
  handleTaskList: () => void;
  handleQuote: () => void;
  handleLink: () => void;
  handleImage: () => void;
  handleInsertTable: () => void;
  togglePreview: () => void;
  handleCodeBlock: () => void;
  handleHorizontalRule: () => void;
  handleMathBlock: () => void;
  handleMermaid: () => void;
  handleFootnote: () => void;
  handleIndent: () => void;
  handleOutdent: () => void;
  handleInsertTOC: () => void;
}

interface MdItemDef {
  id: string;
  label: string;
  tooltip: string;
  toolbarIcon: React.ReactNode;
  menuIcon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  // Start of a new logical group (adds small left margin when inline)
  group?: boolean;
}

function MarkdownToolbarRow({
  activeTab,
  iconSize,
  iconColor,
  borderCls,
  bgCls,
  previewVisible,
  onHeading,
  handlers,
}: {
  activeTab: boolean;
  iconSize: number;
  iconColor: string;
  borderCls: string;
  bgCls: string;
  previewVisible: boolean;
  onHeading: (level: number) => void;
  handlers: MdHandlers;
}) {
  const items = useMemo<MdItemDef[]>(() => [
    { id: 'bold', label: 'Bold', tooltip: 'Bold (⌘B)', toolbarIcon: <Bold size={iconSize} color={iconColor} />, menuIcon: <Bold size={14} />, onClick: handlers.handleBold },
    { id: 'italic', label: 'Italic', tooltip: 'Italic (⌘I)', toolbarIcon: <Italic size={iconSize} color={iconColor} />, menuIcon: <Italic size={14} />, onClick: handlers.handleItalic },
    { id: 'strike', label: 'Strikethrough', tooltip: 'Strikethrough', toolbarIcon: <Strikethrough size={iconSize} color={iconColor} />, menuIcon: <Strikethrough size={14} />, onClick: handlers.handleStrikethrough },
    { id: 'code', label: 'Inline Code', tooltip: 'Inline Code (⌘E)', toolbarIcon: <Code2 size={iconSize} color={iconColor} />, menuIcon: <Code2 size={14} />, onClick: handlers.handleInlineCode },
    { id: 'bullet', group: true, label: 'Bulleted List', tooltip: 'Bulleted List', toolbarIcon: <List size={iconSize} color={iconColor} />, menuIcon: <List size={14} />, onClick: handlers.handleBulletList },
    { id: 'numbered', label: 'Numbered List', tooltip: 'Numbered List', toolbarIcon: <ListOrdered size={iconSize} color={iconColor} />, menuIcon: <ListOrdered size={14} />, onClick: handlers.handleNumberedList },
    { id: 'task', label: 'Task List', tooltip: 'Task List', toolbarIcon: <ListChecks size={iconSize} color={iconColor} />, menuIcon: <ListChecks size={14} />, onClick: handlers.handleTaskList },
    { id: 'quote', label: 'Blockquote', tooltip: 'Blockquote', toolbarIcon: <Quote size={iconSize} color={iconColor} />, menuIcon: <Quote size={14} />, onClick: handlers.handleQuote },
    { id: 'link', group: true, label: 'Link', tooltip: 'Link (⌘K)', toolbarIcon: <Link2 size={iconSize} color={iconColor} />, menuIcon: <Link2 size={14} />, onClick: handlers.handleLink },
    { id: 'image', label: 'Image', tooltip: 'Image', toolbarIcon: <ImageIcon size={iconSize} color={iconColor} />, menuIcon: <ImageIcon size={14} />, onClick: handlers.handleImage },
    { id: 'table', label: 'Insert Table', tooltip: 'Insert Table', toolbarIcon: <Table2 size={iconSize} color={iconColor} />, menuIcon: <Table2 size={14} />, onClick: handlers.handleInsertTable },
    {
      id: 'preview',
      label: previewVisible ? 'Hide Preview' : 'Show Preview',
      tooltip: previewVisible ? 'Hide Preview (⌘⇧V)' : 'Show Preview (⌘⇧V)',
      toolbarIcon: previewVisible ? <EyeOff size={iconSize} color={iconColor} /> : <Eye size={iconSize} color={iconColor} />,
      menuIcon: previewVisible ? <EyeOff size={14} /> : <Eye size={14} />,
      onClick: handlers.togglePreview,
      active: previewVisible,
    },
    { id: 'codeblock', group: true, label: 'Code Block', tooltip: 'Code Block', toolbarIcon: <Code size={iconSize} color={iconColor} />, menuIcon: <Code size={14} />, onClick: handlers.handleCodeBlock },
    { id: 'hr', label: 'Horizontal Rule', tooltip: 'Horizontal Rule', toolbarIcon: <Minus size={iconSize} color={iconColor} />, menuIcon: <Minus size={14} />, onClick: handlers.handleHorizontalRule },
    { id: 'math', label: 'Math Block', tooltip: 'Math Block', toolbarIcon: <Sigma size={iconSize} color={iconColor} />, menuIcon: <Sigma size={14} />, onClick: handlers.handleMathBlock },
    { id: 'mermaid', label: 'Mermaid Diagram', tooltip: 'Mermaid Diagram', toolbarIcon: <GitGraph size={iconSize} color={iconColor} />, menuIcon: <GitGraph size={14} />, onClick: handlers.handleMermaid },
    { id: 'footnote', label: 'Footnote', tooltip: 'Footnote', toolbarIcon: <FileText size={iconSize} color={iconColor} />, menuIcon: <FileText size={14} />, onClick: handlers.handleFootnote },
    { id: 'indent', label: 'Indent', tooltip: 'Indent', toolbarIcon: <IndentIncrease size={iconSize} color={iconColor} />, menuIcon: <IndentIncrease size={14} />, onClick: handlers.handleIndent },
    { id: 'outdent', label: 'Outdent', tooltip: 'Outdent', toolbarIcon: <IndentDecrease size={iconSize} color={iconColor} />, menuIcon: <IndentDecrease size={14} />, onClick: handlers.handleOutdent },
    { id: 'toc', label: 'Insert TOC', tooltip: 'Insert TOC', toolbarIcon: <List size={iconSize} color={iconColor} />, menuIcon: <List size={14} />, onClick: handlers.handleInsertTOC },
  ], [iconSize, iconColor, previewVisible, handlers]);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const moreRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const widthsRef = useRef<number[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(items.length);

  // Measure items once after they first render (all visible)
  useLayoutEffect(() => {
    widthsRef.current = itemRefs.current
      .slice(0, items.length)
      .map(el => (el ? el.getBoundingClientRect().width : 0));
  }, [items.length]);

  // Recompute overflow on mount and whenever the container resizes
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recompute = () => {
      const widths = widthsRef.current;
      if (widths.length === 0) return;
      const GAP = 2;
      const headingW = headingRef.current?.getBoundingClientRect().width ?? 0;
      const available = container.clientWidth - headingW - GAP * (items.length + 1);

      // If everything fits without a More button, show all
      const totalAll = widths.reduce((a, b) => a + b, 0);
      if (totalAll <= available) {
        setVisibleCount(items.length);
        return;
      }

      // Otherwise, reserve space for the More button and count how many fit
      const moreW = moreRef.current?.getBoundingClientRect().width || 32;
      let used = moreW;
      let count = 0;
      for (const w of widths) {
        if (used + w > available) break;
        used += w;
        count++;
      }
      setVisibleCount(Math.max(0, count));
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [items.length]);

  // Items become unstable (e.g. preview icon swap) — re-measure widths if item count changes.
  // Width variations for icon swaps are negligible, so we don't remeasure on every item swap.
  useEffect(() => {
    // placeholder — forces dep lint acknowledgement
  }, [items]);

  const moreItems: MoreMenuItem[] = items
    .slice(visibleCount)
    .map(i => ({ id: i.id, label: i.label, icon: i.menuIcon, onClick: i.onClick }));

  return (
    <div className={`flex items-center px-2 py-1 gap-0.5 border-t ${borderCls} ${bgCls}`}>
      {/* Always-visible heading dropdown (not part of overflow) */}
      <div ref={headingRef} className="flex items-center">
        <HeadingDropdown onSelect={onHeading} disabled={!activeTab} />
      </div>

      {/* Overflow-aware row — flex-1 + min-w-0 lets it shrink within the toolbar */}
      <div ref={containerRef} className="flex items-center gap-0.5 flex-1 min-w-0">
        {items.map((item, i) => {
          const hidden = i >= visibleCount;
          return (
            <div
              key={item.id}
              ref={el => { itemRefs.current[i] = el; }}
              className={item.group && !hidden ? 'ml-1' : ''}
              style={hidden ? { display: 'none' } : undefined}
            >
              <ToolbarButton
                icon={item.toolbarIcon}
                tooltip={item.tooltip}
                onClick={item.onClick}
                active={item.active}
                disabled={!activeTab}
              />
            </div>
          );
        })}

        {/* More dropdown — only rendered when items overflow */}
        <div
          ref={moreRef}
          style={moreItems.length === 0 ? { display: 'none' } : undefined}
        >
          <MoreMenuDropdown disabled={!activeTab} items={moreItems} />
        </div>
      </div>
    </div>
  );
}
