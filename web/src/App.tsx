import { useEffect, useRef } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { useTheme } from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';
import { useSession } from './hooks/useSession';
import { useFileSystem } from './hooks/useFileSystem';
import { useAppStore } from './store/useAppStore';

// Action IDs — must match Rust menu item IDs
type ActionId =
  | 'new-file' | 'open-file' | 'open-folder' | 'save' | 'save-as' | 'close-tab'
  | 'settings'
  | 'find' | 'find-in-project'
  | 'format-document' | 'format-selection'
  | 'toggle-sidebar' | 'toggle-right-panel'
  | 'show-outline' | 'show-files' | 'show-git' | 'show-info'
  | 'toggle-outline' | 'toggle-terminal' | 'toggle-git-panel'
  | 'zen-mode'
  | 'toggle-preview'
  | 'split-vertical' | 'split-horizontal'
  | 'sidebar-narrow' | 'sidebar-widen' | 'rightpanel-widen' | 'rightpanel-narrow'
  | 'window-minimize' | 'window-zoom' | 'window-fullscreen';

function App() {
  useTheme();
  useSettings();
  useSession();
  const { loadDirectory, openFolder, writeFile } = useFileSystem();

  useEffect(() => {
    const isTauri = '__TAURI_INTERNALS__' in window;
    if (!isTauri) {
      loadDirectory('/project');
    }
  }, [loadDirectory]);

  const openFolderRef = useRef(openFolder);
  const writeFileRef = useRef(writeFile);
  openFolderRef.current = openFolder;
  writeFileRef.current = writeFile;

  // Dispatch action by ID (used by both menu events and keyboard shortcuts)
  useEffect(() => {
    const dispatchAction = (id: ActionId) => {
      const store = useAppStore.getState();
      console.log('[action]', id);
      switch (id) {
        case 'new-file': {
          const tabId = `untitled-${Date.now()}`;
          store.openTab(tabId, 'Untitled', '');
          break;
        }
        case 'open-file':
        case 'open-folder':
          openFolderRef.current();
          break;
        case 'save': {
          const activeTab = store.tabs.find(t => t.id === store.activeTabId);
          if (!activeTab) break;
          (async () => {
            const { getMonacoEditorRef } = await import('./components/Layout/Toolbar');
            const editor = getMonacoEditorRef();
            const content = editor?.getValue() ?? activeTab.content;
            store.updateTabContent(activeTab.id, content);

            let savePath = activeTab.path;
            // Untitled file → ask user for path via Save As dialog
            if (savePath.startsWith('untitled-')) {
              if ('__TAURI_INTERNALS__' in window) {
                try {
                  const { invoke } = await import('@tauri-apps/api/core');
                  const selected = await invoke<string | null>('save_file_dialog', {
                    defaultName: activeTab.name === 'Untitled' ? 'untitled.txt' : activeTab.name,
                  });
                  if (!selected) return; // user cancelled
                  savePath = selected;
                  // Update tab path/name/language so future saves use the new path
                  const newName = selected.split('/').pop() ?? activeTab.name;
                  const ext = newName.includes('.') ? newName.split('.').pop()?.toLowerCase() : '';
                  const langMap: Record<string, string> = {
                    js: 'javascript', ts: 'typescript', json: 'json', md: 'markdown',
                    html: 'html', css: 'css', py: 'python', java: 'java', go: 'go',
                    rs: 'rust', sql: 'sql', yaml: 'yaml', yml: 'yaml',
                  };
                  const newLang = (ext && langMap[ext]) || 'plaintext';
                  // Replace tab in store
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
                return; // web mode can't save
              }
            }

            const success = await writeFileRef.current(savePath, content);
            if (success) {
              useAppStore.getState().markTabClean(activeTab.id);
            }
          })();
          break;
        }
        case 'save-as': {
          const activeTab = store.tabs.find(t => t.id === store.activeTabId);
          if (!activeTab) break;
          if (!('__TAURI_INTERNALS__' in window)) break;
          (async () => {
            const { getMonacoEditorRef } = await import('./components/Layout/Toolbar');
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
              const success = await writeFileRef.current(selected, content);
              if (success) {
                useAppStore.setState(state => ({
                  tabs: state.tabs.map(t => t.id === activeTab.id
                    ? { ...t, path: selected, name: newName, language: newLang, dirty: false }
                    : t),
                }));
              }
            } catch (e) {
              console.error('Save As error:', e);
            }
          })();
          break;
        }
        case 'close-tab':
          if (store.activeTabId) store.closeTab(store.activeTabId);
          break;
        case 'settings':
          store.toggleSettings();
          break;
        case 'toggle-sidebar':
          store.toggleSidebar();
          break;
        case 'toggle-right-panel':
          store.toggleRightPanel();
          break;
        case 'show-outline':
          store.showRightPanelTab('outline');
          break;
        case 'show-files':
          store.showRightPanelTab('files');
          break;
        case 'show-git':
          store.showRightPanelTab('git');
          break;
        case 'show-info':
          store.showRightPanelTab('info');
          break;
        case 'toggle-outline':
          store.toggleOutline();
          break;
        case 'toggle-terminal':
          store.toggleTerminal();
          break;
        case 'toggle-git-panel':
          store.toggleGitPanel();
          break;
        case 'toggle-preview':
          store.togglePreview();
          break;
        case 'split-vertical':
          store.toggleSplit('vertical');
          break;
        case 'split-horizontal':
          store.toggleSplit('horizontal');
          break;
        case 'sidebar-narrow':
          store.resizeSidebar(-80);
          break;
        case 'sidebar-widen':
          store.resizeSidebar(80);
          break;
        case 'rightpanel-widen':
          store.resizeRightPanel(80);
          break;
        case 'rightpanel-narrow':
          store.resizeRightPanel(-80);
          break;
        case 'zen-mode': {
          store.toggleZenMode();
          (async () => {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              const win = getCurrentWindow();
              const isFs = await win.isFullscreen();
              await win.setFullscreen(!isFs);
            } catch (e) {
              console.error('Fullscreen toggle failed:', e);
            }
          })();
          break;
        }
        case 'find':
          import('./components/Layout/Toolbar').then(({ getMonacoEditorRef }) => {
            const editor = getMonacoEditorRef();
            if (editor) {
              editor.focus();
              editor.trigger('menu', 'actions.find', null);
            }
          });
          break;
        case 'find-in-project':
          store.toggleSearch();
          break;
        case 'format-document': {
          const activeTab = store.tabs.find(t => t.id === store.activeTabId);
          if (!activeTab) break;
          (async () => {
            const [{ getMonacoEditorRef }, { formatCode, isFormatSupported }] = await Promise.all([
              import('./components/Layout/Toolbar'),
              import('./utils/formatter'),
            ]);
            const editor = getMonacoEditorRef();
            if (!editor) return;

            if (isFormatSupported(activeTab.language)) {
              const result = await formatCode(editor.getValue(), activeTab.language);
              if (result.formatted) {
                const model = editor.getModel();
                if (model) {
                  const fullRange = model.getFullModelRange();
                  editor.executeEdits('format-document', [{
                    range: fullRange,
                    text: result.code,
                  }]);
                }
              } else if (result.error) {
                console.error('Format error:', result.error);
              }
            } else {
              // Fallback to Monaco built-in formatter
              editor.focus();
              editor.trigger('menu', 'editor.action.formatDocument', null);
            }
          })();
          break;
        }
        case 'format-selection': {
          const activeTab = store.tabs.find(t => t.id === store.activeTabId);
          if (!activeTab) break;
          (async () => {
            const [{ getMonacoEditorRef }, { formatSelection, formatCode, isFormatSupported }] = await Promise.all([
              import('./components/Layout/Toolbar'),
              import('./utils/formatter'),
            ]);
            const editor = getMonacoEditorRef();
            if (!editor) return;

            const sel = editor.getSelection();
            const model = editor.getModel();
            if (!sel || !model) return;

            // If no real selection, format whole document
            if (sel.isEmpty()) {
              if (isFormatSupported(activeTab.language)) {
                const result = await formatCode(editor.getValue(), activeTab.language);
                if (result.formatted) {
                  editor.executeEdits('format-document', [{
                    range: model.getFullModelRange(),
                    text: result.code,
                  }]);
                }
              } else {
                editor.focus();
                editor.trigger('menu', 'editor.action.formatDocument', null);
              }
              return;
            }

            const selectedText = model.getValueInRange(sel);
            if (isFormatSupported(activeTab.language)) {
              const result = await formatSelection(selectedText, activeTab.language);
              if (result.formatted) {
                editor.executeEdits('format-selection', [{
                  range: sel,
                  text: result.code,
                }]);
              }
            } else {
              editor.focus();
              editor.trigger('menu', 'editor.action.formatSelection', null);
            }
          })();
          break;
        }
        case 'window-minimize': {
          (async () => {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              await getCurrentWindow().minimize();
            } catch (e) { console.error(e); }
          })();
          break;
        }
        case 'window-zoom': {
          (async () => {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              const win = getCurrentWindow();
              const isMax = await win.isMaximized();
              if (isMax) await win.unmaximize(); else await win.maximize();
            } catch (e) { console.error(e); }
          })();
          break;
        }
        case 'window-fullscreen': {
          (async () => {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              const win = getCurrentWindow();
              const isFs = await win.isFullscreen();
              await win.setFullscreen(!isFs);
            } catch (e) { console.error(e); }
          })();
          break;
        }
      }
    };

    // Listen to Tauri native menu events (may not fire due to Tauri v2 bug)
    let unlistenMenu: (() => void) | undefined;
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<string>('menu-event', (event) => {
          dispatchAction(event.payload as ActionId);
        }).then(fn => { unlistenMenu = fn; });
      });
    }

    // Fallback: keyboard shortcuts handled in React
    const handleKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();

      // Don't intercept Monaco's own shortcuts if editor has focus
      // (but still allow cross-cutting shortcuts like Cmd+B for sidebar)
      let id: ActionId | null = null;

      if (meta && !shift && !alt) {
        if (key === 'n') id = 'new-file';
        else if (key === 'o') id = 'open-file';
        else if (key === 's') id = 'save';
        else if (key === 'w') id = 'close-tab';
        else if (key === ',') id = 'settings';
        else if (key === 'b') id = 'toggle-sidebar';
        else if (key === 'm') id = 'window-minimize';
        else if (key === '\\') id = 'split-vertical';
      } else if (meta && shift && !alt) {
        if (key === 'f') id = 'find-in-project';
        else if (key === 'o') id = 'show-outline';
        else if (key === 'e') id = 'show-files';
        else if (key === 'g') id = 'show-git';
        else if (key === 'i') id = 'show-info';
        else if (key === 's') id = 'save-as';
        else if (key === '\\') id = 'split-horizontal';
        else if (key === 'v') {
          // Only intercept ⌘⇧V when current tab is markdown or HTML — otherwise let paste-without-formatting pass through
          const state = useAppStore.getState();
          const activeTab = state.tabs.find(t => t.id === state.activeTabId);
          if (activeTab && (activeTab.language === 'markdown' || activeTab.language === 'html')) id = 'toggle-preview';
        }
      } else if (meta && alt && !shift) {
        if (key === 'b') id = 'toggle-right-panel';
        else if (key === 'arrowleft') id = 'sidebar-narrow';
        else if (key === 'arrowright') id = 'sidebar-widen';
      } else if (!meta && shift && alt) {
        // Shift+Option+F → Format Document (VS Code standard)
        if (key === 'f' || key === 'ƒ') id = 'format-document';
      } else if (meta && shift && alt) {
        // Cmd+Shift+Option+F → Format Selection
        if (key === 'f' || key === 'ƒ') id = 'format-selection';
        else if (key === 'arrowleft') id = 'rightpanel-widen';
        else if (key === 'arrowright') id = 'rightpanel-narrow';
      } else if (!meta && !shift && !alt) {
        if (key === 'f11') id = 'zen-mode';
      }

      if (id) {
        e.preventDefault();
        dispatchAction(id);
      }
    };

    window.addEventListener('keydown', handleKey);

    return () => {
      unlistenMenu?.();
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return <MainLayout />;
}

export default App;
