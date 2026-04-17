import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../hooks/useTheme';
import { useFileSystem } from '../../hooks/useFileSystem';
import { getMonacoEditorRef } from './Toolbar';
import { isFormatSupported } from '../../utils/formatter';

type MenuItem =
  | { kind: 'item'; label: string; shortcut?: string; onClick: () => void; disabled?: boolean }
  | { kind: 'separator' };

interface MenuDef {
  id: string;
  label: string;
  items: MenuItem[];
}

export function MenuBar() {
  const theme = useAppStore(s => s.settings.theme);
  const { toggleTheme } = useTheme();
  const { openFolder, writeFile } = useFileSystem();

  const toggleSidebar = useAppStore(s => s.toggleSidebar);
  const toggleRightPanel = useAppStore(s => s.toggleRightPanel);
  const toggleSearch = useAppStore(s => s.toggleSearch);
  const toggleGitPanel = useAppStore(s => s.toggleGitPanel);
  const toggleTerminal = useAppStore(s => s.toggleTerminal);
  const toggleOutline = useAppStore(s => s.toggleOutline);
  const toggleZenMode = useAppStore(s => s.toggleZenMode);
  const toggleSettings = useAppStore(s => s.toggleSettings);
  const togglePreview = useAppStore(s => s.togglePreview);

  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const openTab = useAppStore(s => s.openTab);
  const closeTab = useAppStore(s => s.closeTab);
  const closeAllTabs = useAppStore(s => s.closeAllTabs);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;
  const hasActiveTab = !!activeTab;

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!openMenuId) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

  // --- Action handlers ---

  const handleNewFile = useCallback(() => {
    const id = `untitled-${Date.now()}`;
    openTab(id, 'Untitled', '');
  }, [openTab]);

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    const editor = getMonacoEditorRef();
    const content = editor?.getValue() ?? activeTab.content;
    const store = useAppStore.getState();
    store.updateTabContent(activeTab.id, content);

    let savePath = activeTab.path;
    if (savePath.startsWith('untitled-')) {
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

    const ok = await writeFile(savePath, content);
    if (ok) useAppStore.getState().markTabClean(activeTab.id);
  }, [activeTab, writeFile]);

  const handleSaveAs = useCallback(async () => {
    if (!activeTab) return;
    if (!('__TAURI_INTERNALS__' in window)) return;
    const editor = getMonacoEditorRef();
    const content = editor?.getValue() ?? activeTab.content;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const defaultName = activeTab.path.startsWith('untitled-')
        ? (activeTab.name === 'Untitled' ? 'untitled.txt' : activeTab.name)
        : activeTab.name;
      const selected = await invoke<string | null>('save_file_dialog', { defaultName });
      if (!selected) return;
      const newName = selected.split('/').pop() ?? activeTab.name;
      const ext = newName.includes('.') ? newName.split('.').pop()?.toLowerCase() : '';
      const langMap: Record<string, string> = {
        js: 'javascript', ts: 'typescript', json: 'json', md: 'markdown',
        html: 'html', css: 'css', py: 'python', java: 'java', go: 'go',
        rs: 'rust', sql: 'sql', yaml: 'yaml', yml: 'yaml',
      };
      const newLang = (ext && langMap[ext]) || activeTab.language;
      const ok = await writeFile(selected, content);
      if (ok) {
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

  const handleCloseTab = useCallback(() => {
    if (activeTabId) closeTab(activeTabId);
  }, [activeTabId, closeTab]);

  const trigger = useCallback((action: string) => {
    const editor = getMonacoEditorRef();
    editor?.trigger('menubar', action, null);
  }, []);

  const handleUndo = useCallback(() => trigger('undo'), [trigger]);
  const handleRedo = useCallback(() => trigger('redo'), [trigger]);

  const handleCut = useCallback(() => {
    getMonacoEditorRef()?.focus();
    document.execCommand('cut');
  }, []);
  const handleCopy = useCallback(() => {
    getMonacoEditorRef()?.focus();
    document.execCommand('copy');
  }, []);
  const handlePaste = useCallback(() => {
    getMonacoEditorRef()?.focus();
    document.execCommand('paste');
  }, []);

  const handleFind = useCallback(() => trigger('actions.find'), [trigger]);
  const handleReplace = useCallback(() => trigger('editor.action.startFindReplaceAction'), [trigger]);

  const handleZenMode = useCallback(async () => {
    toggleZenMode();
    if ('__TAURI_INTERNALS__' in window) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        const isFs = await win.isFullscreen();
        await win.setFullscreen(!isFs);
      } catch (e) { console.error(e); }
    }
  }, [toggleZenMode]);

  const handleFormatDocument = useCallback(async () => {
    const editor = getMonacoEditorRef();
    if (!editor || !activeTab) return;
    const { formatCode } = await import('../../utils/formatter');
    if (isFormatSupported(activeTab.language)) {
      const result = await formatCode(editor.getValue(), activeTab.language);
      if (result.formatted) {
        const model = editor.getModel();
        if (model) {
          editor.executeEdits('format-document', [{
            range: model.getFullModelRange(),
            text: result.code,
          }]);
        }
      }
    } else {
      editor.focus();
      editor.trigger('menubar', 'editor.action.formatDocument', null);
    }
  }, [activeTab]);

  const handleFormatSelection = useCallback(async () => {
    const editor = getMonacoEditorRef();
    if (!editor || !activeTab) return;
    const { formatSelection, formatCode } = await import('../../utils/formatter');
    const sel = editor.getSelection();
    const model = editor.getModel();
    if (!sel || !model) return;
    if (sel.isEmpty()) {
      if (isFormatSupported(activeTab.language)) {
        const result = await formatCode(editor.getValue(), activeTab.language);
        if (result.formatted) {
          editor.executeEdits('format-document', [{
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
        editor.executeEdits('format-selection', [{ range: sel, text: result.code }]);
      }
    } else {
      editor.focus();
      editor.trigger('menubar', 'editor.action.formatSelection', null);
    }
  }, [activeTab]);

  const handleAbout = useCallback(() => {
    alert('Folio\n\n마크다운 지원 텍스트 에디터\nBuilt with Tauri + React');
  }, []);

  // --- Menu definitions ---

  const menus = useMemo<MenuDef[]>(() => [
    {
      id: 'file',
      label: '파일',
      items: [
        { kind: 'item', label: '새 파일', shortcut: '⌘N', onClick: handleNewFile },
        { kind: 'item', label: '폴더 열기…', shortcut: '⌘O', onClick: openFolder },
        { kind: 'separator' },
        { kind: 'item', label: '저장', shortcut: '⌘S', onClick: handleSave, disabled: !hasActiveTab },
        { kind: 'item', label: '다른 이름으로 저장…', shortcut: '⌘⇧S', onClick: handleSaveAs, disabled: !hasActiveTab },
        { kind: 'separator' },
        { kind: 'item', label: '탭 닫기', shortcut: '⌘W', onClick: handleCloseTab, disabled: !hasActiveTab },
        { kind: 'item', label: '모든 탭 닫기', onClick: closeAllTabs, disabled: tabs.length === 0 },
      ],
    },
    {
      id: 'edit',
      label: '편집',
      items: [
        { kind: 'item', label: '실행 취소', shortcut: '⌘Z', onClick: handleUndo, disabled: !hasActiveTab },
        { kind: 'item', label: '다시 실행', shortcut: '⌘⇧Z', onClick: handleRedo, disabled: !hasActiveTab },
        { kind: 'separator' },
        { kind: 'item', label: '잘라내기', shortcut: '⌘X', onClick: handleCut, disabled: !hasActiveTab },
        { kind: 'item', label: '복사', shortcut: '⌘C', onClick: handleCopy, disabled: !hasActiveTab },
        { kind: 'item', label: '붙여넣기', shortcut: '⌘V', onClick: handlePaste, disabled: !hasActiveTab },
        { kind: 'separator' },
        { kind: 'item', label: '찾기', shortcut: '⌘F', onClick: handleFind, disabled: !hasActiveTab },
        { kind: 'item', label: '바꾸기', shortcut: '⌘⌥F', onClick: handleReplace, disabled: !hasActiveTab },
        { kind: 'item', label: '프로젝트에서 검색', shortcut: '⌘⇧F', onClick: toggleSearch },
      ],
    },
    {
      id: 'view',
      label: '보기',
      items: [
        { kind: 'item', label: '사이드바 토글', shortcut: '⌘B', onClick: toggleSidebar },
        { kind: 'item', label: '오른쪽 패널 토글', shortcut: '⌘⌥B', onClick: toggleRightPanel },
        { kind: 'item', label: '아웃라인', shortcut: '⌘⇧O', onClick: toggleOutline },
        { kind: 'item', label: '터미널', shortcut: '⌃`', onClick: toggleTerminal },
        { kind: 'item', label: '미리보기 토글', shortcut: '⌘⇧V', onClick: togglePreview, disabled: !hasActiveTab },
        { kind: 'separator' },
        { kind: 'item', label: '젠 모드', shortcut: 'F11', onClick: handleZenMode },
        { kind: 'separator' },
        { kind: 'item', label: theme === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환', onClick: toggleTheme },
      ],
    },
    {
      id: 'format',
      label: '형식',
      items: [
        { kind: 'item', label: '문서 포맷', shortcut: '⇧⌥F', onClick: handleFormatDocument, disabled: !hasActiveTab },
        { kind: 'item', label: '선택 영역 포맷', shortcut: '⌘⇧⌥F', onClick: handleFormatSelection, disabled: !hasActiveTab },
      ],
    },
    {
      id: 'tools',
      label: '도구',
      items: [
        { kind: 'item', label: 'Git 패널', onClick: toggleGitPanel },
        { kind: 'separator' },
        { kind: 'item', label: '설정', shortcut: '⌘,', onClick: toggleSettings },
      ],
    },
    {
      id: 'help',
      label: '도움말',
      items: [
        { kind: 'item', label: 'Folio 정보', onClick: handleAbout },
      ],
    },
  ], [
    handleNewFile, openFolder, handleSave, handleSaveAs, handleCloseTab, closeAllTabs, tabs.length, hasActiveTab,
    handleUndo, handleRedo, handleCut, handleCopy, handlePaste, handleFind, handleReplace, toggleSearch,
    toggleSidebar, toggleRightPanel, toggleOutline, toggleTerminal, togglePreview, handleZenMode, theme, toggleTheme,
    handleFormatDocument, handleFormatSelection, toggleGitPanel, toggleSettings, handleAbout,
  ]);

  // --- Styles ---

  const barBg = theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-100';
  const barBorder = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const labelText = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';
  const labelHover = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200';
  const labelActiveBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200';
  const menuBg = theme === 'dark' ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-zinc-200';
  const menuItemHover = theme === 'dark' ? 'hover:bg-blue-600 hover:text-white' : 'hover:bg-blue-500 hover:text-white';
  const itemText = theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800';
  const shortcutText = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const separatorBg = theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200';

  return (
    <div
      ref={containerRef}
      className={`flex items-center select-none shrink-0 border-b ${barBg} ${barBorder} px-1 relative`}
    >
      {menus.map(menu => {
        const isOpen = openMenuId === menu.id;
        return (
          <div key={menu.id} className="relative">
            <button
              type="button"
              onClick={() => setOpenMenuId(isOpen ? null : menu.id)}
              onMouseEnter={() => {
                if (openMenuId && openMenuId !== menu.id) setOpenMenuId(menu.id);
              }}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${labelText} ${isOpen ? labelActiveBg : labelHover}`}
            >
              {menu.label}
            </button>

            {isOpen && (
              <div
                className={`absolute top-full left-0 mt-0.5 py-1 rounded-md shadow-lg border z-50 min-w-[220px] ${menuBg}`}
              >
                {menu.items.map((item, idx) => {
                  if (item.kind === 'separator') {
                    return <div key={`sep-${idx}`} className={`my-1 h-px ${separatorBg}`} />;
                  }
                  return (
                    <div
                      key={`${menu.id}-${idx}`}
                      onClick={() => {
                        if (item.disabled) return;
                        item.onClick();
                        setOpenMenuId(null);
                      }}
                      className={`flex items-center justify-between gap-6 px-3 py-1 text-xs cursor-pointer ${itemText} ${
                        item.disabled ? 'opacity-40 cursor-not-allowed' : menuItemHover
                      } group`}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className={`${shortcutText} group-hover:text-white/80`}>{item.shortcut}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
