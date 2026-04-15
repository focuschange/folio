import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useAppStore } from '../../store/useAppStore';
import { setMonacoEditorRef } from '../Layout/Toolbar';
import { formatCode, formatSelection, isFormatSupported } from '../../utils/formatter';
import type { EditorTab } from '../../types';

interface MonacoWrapperProps {
  tab: EditorTab;
}

// Stable reference for the "no bookmarks" case — avoids returning a fresh [] on every selector call,
// which would otherwise invalidate the `bookmarks` useEffect dep and re-run the decoration sync repeatedly.
const EMPTY_LINES: number[] = [];

export function MonacoWrapper({ tab }: MonacoWrapperProps) {
  const settings = useAppStore(s => s.settings);
  const updateTabContent = useAppStore(s => s.updateTabContent);
  const updateTabCursor = useAppStore(s => s.updateTabCursor);
  // Subscribe to the bookmarks map then derive path-specific list so we get a stable reference
  const bookmarksMap = useAppStore(s => s.bookmarks);
  const bookmarks = bookmarksMap[tab.path] ?? EMPTY_LINES;
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    setMonacoEditorRef(editor);

    editor.onDidChangeCursorPosition((e) => {
      updateTabCursor(tab.id, e.position.lineNumber, e.position.column);
    });

    // Register custom Format Document action — appears in right-click context menu
    editor.addAction({
      id: 'folio.format-document',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1.5,
      run: async (ed) => {
        const activeTab = useAppStore.getState().tabs.find(t => t.id === useAppStore.getState().activeTabId);
        const lang = activeTab?.language ?? 'plaintext';
        if (isFormatSupported(lang)) {
          const result = await formatCode(ed.getValue(), lang);
          if (result.formatted) {
            const model = ed.getModel();
            if (model) {
              ed.executeEdits('format-document', [{
                range: model.getFullModelRange(),
                text: result.code,
              }]);
            }
          }
        } else {
          ed.trigger('context-menu', 'editor.action.formatDocument', null);
        }
      },
    });

    // Register custom Format Selection action
    editor.addAction({
      id: 'folio.format-selection',
      label: 'Format Selection',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1.6,
      precondition: 'editorHasSelection',
      run: async (ed) => {
        const activeTab = useAppStore.getState().tabs.find(t => t.id === useAppStore.getState().activeTabId);
        const lang = activeTab?.language ?? 'plaintext';
        const sel = ed.getSelection();
        const model = ed.getModel();
        if (!sel || !model) return;
        const selectedText = model.getValueInRange(sel);
        if (isFormatSupported(lang)) {
          const result = await formatSelection(selectedText, lang);
          if (result.formatted) {
            ed.executeEdits('format-selection', [{
              range: sel,
              text: result.code,
            }]);
          }
        } else {
          ed.trigger('context-menu', 'editor.action.formatSelection', null);
        }
      },
    });

    // Toggle bookmark on current line (Cmd+F2)
    editor.addAction({
      id: 'folio.toggle-bookmark',
      label: 'Toggle Bookmark',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.F2],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2.0,
      run: (ed) => {
        const pos = ed.getPosition();
        if (!pos) return;
        const activeTab = useAppStore.getState().tabs.find(t => t.id === useAppStore.getState().activeTabId);
        if (!activeTab) return;
        useAppStore.getState().toggleBookmark(activeTab.path, pos.lineNumber);
      },
    });

    // Clear all bookmarks for current file
    editor.addAction({
      id: 'folio.clear-bookmarks',
      label: 'Clear Bookmarks (this file)',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2.1,
      run: (ed) => {
        const activeTab = useAppStore.getState().tabs.find(t => t.id === useAppStore.getState().activeTabId);
        if (!activeTab) return;
        useAppStore.getState().clearBookmarksForFile(activeTab.path);
        void ed; // no-op, decorations updated by useEffect
      },
    });

    // Create decoration collection
    decorationsRef.current = editor.createDecorationsCollection([]);

    editor.focus();
  }, [tab.id, updateTabCursor]);

  // Sync bookmark decorations when bookmarks change
  useEffect(() => {
    if (!decorationsRef.current) return;
    const decorations: monaco.editor.IModelDeltaDecoration[] = bookmarks.map(line => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        linesDecorationsClassName: 'folio-bookmark-marker',
        className: 'folio-bookmark-line',
        overviewRuler: {
          color: '#3b82f6',
          position: monaco.editor.OverviewRulerLane.Full,
        },
      },
    }));
    decorationsRef.current.set(decorations);
  }, [bookmarks]);

  // Update toolbar ref when this tab becomes active
  useEffect(() => {
    if (editorRef.current) {
      setMonacoEditorRef(editorRef.current);
    }
    return () => {
      // Don't clear on unmount — another tab may take over
    };
  }, [tab.id]);

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      updateTabContent(tab.id, value);
    }
  }, [tab.id, updateTabContent]);

  const monacoTheme = settings.theme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <div className="h-full w-full">
      <Editor
        theme={monacoTheme}
        language={tab.language}
        value={tab.content}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap,
          minimap: { enabled: settings.minimap },
          lineNumbers: settings.lineNumbers,
          renderWhitespace: settings.renderWhitespace,
          bracketPairColorization: { enabled: settings.bracketPairColorization },
          smoothScrolling: settings.smoothScrolling,
          cursorBlinking: settings.cursorBlinking,
          cursorStyle: settings.cursorStyle,
          padding: { top: settings.editorPadding, bottom: settings.editorPadding },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          suggest: {
            showWords: true,
            showSnippets: true,
          },
          quickSuggestions: true,
          folding: true,
          foldingStrategy: 'indentation',
          links: true,
          colorDecorators: true,
          guides: {
            indentation: true,
            bracketPairs: true,
            highlightActiveIndentation: true,
          },
        }}
        loading={
          <div className={`flex items-center justify-center h-full text-sm ${
            settings.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
