import { useState, useCallback } from 'react';
import {
  FilePlus, FolderOpen, Save,
  Undo2, Redo2, Scissors, Copy, Clipboard,
  Search, FolderSearch,
  PanelLeft, List, Maximize2,
  Bold, Italic, ListOrdered, Table2,
  GitBranch,
  Settings,
  Sun, Moon,
  Terminal,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../hooks/useTheme';
import { useFileSystem } from '../../hooks/useFileSystem';

// Global reference to Monaco editor instance for toolbar actions
let monacoEditorRef: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;

export function setMonacoEditorRef(editor: import('monaco-editor').editor.IStandaloneCodeEditor | null) {
  monacoEditorRef = editor;
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
  const {
    toggleSidebar, toggleSearch, toggleGitPanel, toggleTerminal,
    toggleZenMode, toggleSettings, toggleOutline,
    sidebarVisible, gitPanelVisible, terminalVisible, outlineVisible,
    activeTabId, tabs, openTab,
  } = useAppStore();
  const { openFolder, writeFile } = useFileSystem();
  const iconSize = 16;
  const iconColor = theme === 'dark' ? '#a1a1aa' : '#52525b';

  const activeTab = tabs.find(t => t.id === activeTabId);

  // --- Action handlers ---

  const handleNewFile = useCallback(() => {
    const id = `untitled-${Date.now()}`;
    openTab(id, 'Untitled', '');
  }, [openTab]);

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    if (activeTab.path.startsWith('untitled-')) return; // Can't save untitled without path
    const content = monacoEditorRef?.getValue() ?? activeTab.content;
    const success = await writeFile(activeTab.path, content);
    if (success) {
      const { markTabClean } = useAppStore.getState();
      markTabClean(activeTab.id);
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

  const wrapSelection = useCallback((before: string, after: string) => {
    if (!monacoEditorRef) return;
    const selection = monacoEditorRef.getSelection();
    if (!selection) return;
    const selectedText = monacoEditorRef.getModel()?.getValueInRange(selection) ?? '';
    monacoEditorRef.executeEdits('toolbar', [{
      range: selection,
      text: `${before}${selectedText}${after}`,
    }]);
    monacoEditorRef.focus();
  }, []);

  const handleBold = useCallback(() => wrapSelection('**', '**'), [wrapSelection]);
  const handleItalic = useCallback(() => wrapSelection('*', '*'), [wrapSelection]);

  const handleInsertTOC = useCallback(() => {
    if (!monacoEditorRef) return;
    const content = monacoEditorRef.getValue();
    const headings = content.match(/^#{1,6}\s+.+$/gm) ?? [];
    const toc = headings.map(h => {
      const level = h.match(/^(#+)/)?.[1].length ?? 1;
      const text = h.replace(/^#+\s+/, '');
      const slug = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `${'  '.repeat(level - 1)}- [${text}](#${slug})`;
    }).join('\n');
    const pos = monacoEditorRef.getPosition();
    if (pos) {
      monacoEditorRef.executeEdits('toolbar', [{
        range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
        text: `\n## Table of Contents\n\n${toc}\n\n`,
      }]);
    }
    monacoEditorRef.focus();
  }, []);

  const handleInsertTable = useCallback(() => {
    if (!monacoEditorRef) return;
    // Insert a simple 3x3 table
    const table = `| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n`;
    const pos = monacoEditorRef.getPosition();
    if (pos) {
      monacoEditorRef.executeEdits('toolbar', [{
        range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
        text: `\n${table}\n`,
      }]);
    }
    monacoEditorRef.focus();
  }, []);

  return (
    <div className={`flex items-center px-2 py-1 gap-0.5 border-b select-none shrink-0 ${
      theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
    }`}>
      {/* File */}
      <ToolbarButton icon={<FilePlus size={iconSize} color={iconColor} />} tooltip="New File" onClick={handleNewFile} />
      <ToolbarButton icon={<FolderOpen size={iconSize} color={iconColor} />} tooltip="Open Folder" onClick={openFolder} />
      <ToolbarButton icon={<Save size={iconSize} color={iconColor} />} tooltip="Save (⌘S)" onClick={handleSave} disabled={!activeTab} />

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
      <ToolbarButton icon={<List size={iconSize} color={iconColor} />} tooltip="Outline (⌘⇧O)" onClick={toggleOutline} active={outlineVisible} />
      <ToolbarButton icon={<Terminal size={iconSize} color={iconColor} />} tooltip="Terminal (⌃`)" onClick={toggleTerminal} active={terminalVisible} />
      <ToolbarButton icon={<Maximize2 size={iconSize} color={iconColor} />} tooltip="Zen Mode" onClick={toggleZenMode} />

      <Separator />

      {/* Markdown */}
      <ToolbarButton icon={<Bold size={iconSize} color={iconColor} />} tooltip="Bold (⌘B)" onClick={handleBold} disabled={!activeTab} />
      <ToolbarButton icon={<Italic size={iconSize} color={iconColor} />} tooltip="Italic (⌘I)" onClick={handleItalic} disabled={!activeTab} />
      <ToolbarButton icon={<ListOrdered size={iconSize} color={iconColor} />} tooltip="Insert TOC" onClick={handleInsertTOC} disabled={!activeTab} />
      <ToolbarButton icon={<Table2 size={iconSize} color={iconColor} />} tooltip="Insert Table" onClick={handleInsertTable} disabled={!activeTab} />

      <Separator />

      {/* Git */}
      <ToolbarButton icon={<GitBranch size={iconSize} color={iconColor} />} tooltip="Git Panel" onClick={toggleGitPanel} active={gitPanelVisible} />

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
  );
}
