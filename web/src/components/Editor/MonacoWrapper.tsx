import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useAppStore } from '../../store/useAppStore';
import { setMonacoEditorRef } from '../Layout/Toolbar';
import type { EditorTab } from '../../types';

interface MonacoWrapperProps {
  tab: EditorTab;
}

export function MonacoWrapper({ tab }: MonacoWrapperProps) {
  const settings = useAppStore(s => s.settings);
  const updateTabContent = useAppStore(s => s.updateTabContent);
  const updateTabCursor = useAppStore(s => s.updateTabCursor);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    setMonacoEditorRef(editor);

    editor.onDidChangeCursorPosition((e) => {
      updateTabCursor(tab.id, e.position.lineNumber, e.position.column);
    });

    editor.focus();
  }, [tab.id, updateTabCursor]);

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
            bracketPairs: true,
            indentation: true,
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
