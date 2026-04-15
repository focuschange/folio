import { useState, useCallback } from 'react';
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
  const {
    toggleSidebar, toggleRightPanel, toggleSearch, toggleGitPanel, toggleTerminal,
    toggleZenMode, toggleSettings, toggleOutline,
    sidebarVisible, terminalVisible, activeRightTab, rightPanelVisible,
    activeTabId, tabs, openTab,
  } = useAppStore();
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

  return (
    <div className={`flex items-center px-2 py-1 gap-0.5 border-b select-none shrink-0 ${
      theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
    }`}>
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

      {/* Markdown — text styles */}
      <HeadingDropdown onSelect={handleHeading} disabled={!activeTab || !isMarkdown} />
      <ToolbarButton icon={<Bold size={iconSize} color={iconColor} />} tooltip="Bold (⌘B)" onClick={handleBold} disabled={!activeTab || !isMarkdown} />
      <ToolbarButton icon={<Italic size={iconSize} color={iconColor} />} tooltip="Italic (⌘I)" onClick={handleItalic} disabled={!activeTab || !isMarkdown} />
      <ToolbarButton icon={<Strikethrough size={iconSize} color={iconColor} />} tooltip="Strikethrough" onClick={handleStrikethrough} disabled={!activeTab || !isMarkdown} />
      <ToolbarButton icon={<Code2 size={iconSize} color={iconColor} />} tooltip="Inline Code (⌘E)" onClick={handleInlineCode} disabled={!activeTab || !isMarkdown} />

      <Separator />

      {/* Markdown — lists & blocks */}
      <ToolbarButton icon={<List size={iconSize} color={iconColor} />} tooltip="Bulleted List" onClick={handleBulletList} disabled={!activeTab || !isMarkdown} />
      <ToolbarButton icon={<ListOrdered size={iconSize} color={iconColor} />} tooltip="Numbered List" onClick={handleNumberedList} disabled={!activeTab || !isMarkdown} />
      <ToolbarButton icon={<ListChecks size={iconSize} color={iconColor} />} tooltip="Task List" onClick={handleTaskList} disabled={!activeTab || !isMarkdown} />
      <ToolbarButton icon={<Quote size={iconSize} color={iconColor} />} tooltip="Blockquote" onClick={handleQuote} disabled={!activeTab || !isMarkdown} />

      <Separator />

      {/* Markdown — insert */}
      <ToolbarButton icon={<Link2 size={iconSize} color={iconColor} />} tooltip="Link (⌘K)" onClick={handleLink} disabled={!activeTab || !isMarkdown} />
      <ToolbarButton icon={<ImageIcon size={iconSize} color={iconColor} />} tooltip="Image" onClick={handleImage} disabled={!activeTab || !isMarkdown} />
      <ToolbarButton icon={<Table2 size={iconSize} color={iconColor} />} tooltip="Insert Table" onClick={handleInsertTable} disabled={!activeTab || !isMarkdown} />

      <MoreMenuDropdown
        disabled={!activeTab || !isMarkdown}
        items={[
          { id: 'codeblock', label: 'Code Block', icon: <Code size={14} />, onClick: handleCodeBlock },
          { id: 'hr', label: 'Horizontal Rule', icon: <Minus size={14} />, onClick: handleHorizontalRule },
          { id: 'math', label: 'Math Block', icon: <Sigma size={14} />, onClick: handleMathBlock },
          { id: 'mermaid', label: 'Mermaid Diagram', icon: <GitGraph size={14} />, onClick: handleMermaid },
          { id: 'footnote', label: 'Footnote', icon: <FileText size={14} />, onClick: handleFootnote },
          { id: 'indent', label: 'Indent', icon: <IndentIncrease size={14} />, onClick: handleIndent },
          { id: 'outdent', label: 'Outdent', icon: <IndentDecrease size={14} />, onClick: handleOutdent },
          { id: 'toc', label: 'Insert TOC', icon: <List size={14} />, onClick: handleInsertTOC },
        ] as MoreMenuItem[]}
      />

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
  );
}
