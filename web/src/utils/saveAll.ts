// Shared "Save All" implementation used by both the keyboard shortcut (App.tsx)
// and the File menu (MenuBar.tsx).
//
// Behavior:
// - Named tabs (have a real path): write to that path.
// - Untitled tabs: persist to `~/.folio/untitled/<sanitized-name>.<ext>` so the
//   content survives app reinstalls. The tab's path/name are then updated to
//   that real path, after which it behaves like a normal saved tab.
// - Skips clean tabs.

import { useAppStore } from '../store/useAppStore';
import type { EditorTab } from '../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// Strip characters that aren't safe in filenames on macOS/Linux/Windows.
function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Untitled';
}

// Build a stable filename for an Untitled tab. Includes a short slice of the
// tab id so two tabs both named "Untitled" don't collide.
function untitledFileName(tab: EditorTab): string {
  // tab.id format: "untitled-<timestamp>" — take the timestamp tail as the suffix
  const idTail = tab.id.startsWith('untitled-') ? tab.id.slice('untitled-'.length) : tab.id;
  const baseName = sanitize(tab.name === 'Untitled' ? 'Untitled' : tab.name);
  // If user already added an extension to the name, keep it; else default to .txt
  if (/\.[a-zA-Z0-9]+$/.test(baseName)) {
    const dotIdx = baseName.lastIndexOf('.');
    return `${baseName.slice(0, dotIdx)}-${idTail}${baseName.slice(dotIdx)}`;
  }
  return `${baseName}-${idTail}.txt`;
}

function detectLanguage(filename: string, fallback: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : '';
  const langMap: Record<string, string> = {
    js: 'javascript', ts: 'typescript', json: 'json', md: 'markdown',
    html: 'html', css: 'css', py: 'python', java: 'java', go: 'go',
    rs: 'rust', sql: 'sql', yaml: 'yaml', yml: 'yaml',
  };
  return (ext && langMap[ext]) || fallback;
}

export interface SaveAllResult {
  saved: number;
  failed: number;
  total: number;
}

/**
 * Save every dirty tab. Untitled tabs get auto-persisted under ~/.folio/untitled.
 * @param writeFile The same writeFile from useFileSystem (handles Tauri vs web mode).
 * @param getActiveContent Returns the live editor content for the active tab (Monaco buffer);
 *                         other tabs use their stored content.
 */
export async function saveAllDirtyTabs(
  writeFile: (path: string, content: string) => Promise<boolean>,
  getActiveContent: () => string | null,
): Promise<SaveAllResult> {
  const state = useAppStore.getState();
  const dirty = state.tabs.filter(t => t.dirty);
  if (dirty.length === 0) return { saved: 0, failed: 0, total: 0 };

  // Resolve untitled directory once if we have any untitled tabs
  let untitledDir: string | null = null;
  if (isTauri && dirty.some(t => t.path.startsWith('untitled-'))) {
    try {
      untitledDir = await tauriInvoke<string>('untitled_dir');
    } catch (e) {
      console.error('[save-all] failed to resolve untitled dir:', e);
    }
  }

  let saved = 0;
  let failed = 0;
  for (const tab of dirty) {
    // Pull the freshest content for the currently-active tab from Monaco
    const content = (tab.id === state.activeTabId)
      ? (getActiveContent() ?? tab.content)
      : tab.content;

    // Sync the in-store content for the active tab so subsequent saves see it
    if (tab.id === state.activeTabId) {
      useAppStore.getState().updateTabContent(tab.id, content);
    }

    if (tab.path.startsWith('untitled-')) {
      // Untitled: write to ~/.folio/untitled/<name> and re-bind the tab to that path
      if (!untitledDir) { failed++; continue; }
      const fileName = untitledFileName(tab);
      const fullPath = `${untitledDir}/${fileName}`;
      const ok = await writeFile(fullPath, content);
      if (!ok) { failed++; continue; }

      const newLang = detectLanguage(fileName, tab.language);
      // Replace tab path/name/language atomically and clear dirty flag
      useAppStore.setState(s => ({
        tabs: s.tabs.map(t => t.id === tab.id
          ? { ...t, path: fullPath, name: fileName, language: newLang, dirty: false }
          : t),
      }));
      saved++;
    } else {
      const ok = await writeFile(tab.path, content);
      if (!ok) { failed++; continue; }
      useAppStore.getState().markTabClean(tab.id);
      saved++;
    }
  }

  return { saved, failed, total: dirty.length };
}
