import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { SessionState, FileEntry } from '../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

const STORAGE_KEY = 'folio-session';

function saveSessionSync() {
  const state = useAppStore.getState();
  const session: SessionState = state.getSessionState();
  const json = JSON.stringify(session);

  if (!isTauri) {
    localStorage.setItem(STORAGE_KEY, json);
    return;
  }
  tauriInvoke('save_session', { sessionJson: json }).catch(() => {});
}

async function saveSessionAsync() {
  const state = useAppStore.getState();
  const session: SessionState = state.getSessionState();
  const json = JSON.stringify(session);

  if (isTauri) {
    try {
      await tauriInvoke('save_session', { sessionJson: json });
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  } else {
    localStorage.setItem(STORAGE_KEY, json);
  }
}

async function restoreSessionFromDisk() {
  try {
    let json: string;
    if (isTauri) {
      json = await tauriInvoke<string>('load_session');
    } else {
      json = localStorage.getItem(STORAGE_KEY) || '{}';
    }

    const session: SessionState = JSON.parse(json);

    // Save the expandedDirs BEFORE loadDirectory overwrites them
    const savedExpandedDirs = session.expandedDirs ?? [];

    // 1. Restore UI state (panels, sizes, tabs, etc.). `restoreSession` intentionally
    //    leaves projectRoots empty — they get repopulated below for paths that exist.
    useAppStore.getState().restoreSession(session);

    // 2. Reload file trees for each project root. Roots that no longer exist on disk
    //    are silently skipped so they're naturally pruned from session state.
    if (session.projectRoots && session.projectRoots.length > 0) {
      const includeHidden = useAppStore.getState().settings.showHiddenFiles;
      for (const rootPath of session.projectRoots) {
        if (!isTauri) continue;
        try {
          const tree = await tauriInvoke<FileEntry[]>('list_directory', { path: rootPath, includeHidden });
          useAppStore.getState().addProjectRoot(rootPath, tree);
        } catch {
          // silently drop — directory no longer exists or is inaccessible
        }
      }
    }

    // 3. Re-apply saved expandedDirs AFTER file trees are loaded
    //    (addProjectRoot only adds root path, we need all previously expanded dirs)
    if (savedExpandedDirs.length > 0) {
      useAppStore.setState({ expandedDirs: new Set(savedExpandedDirs) });
    }

    // 4. Mark any open tabs whose backing file is missing.
    await checkOpenTabsExistence();
  } catch (e) {
    console.error('Failed to restore session:', e);
  }
}

// Verify each open (non-untitled) tab still points to an existing file. Marks missing
// tabs in the store; UI shows a warning indicator on those tabs.
async function checkOpenTabsExistence() {
  if (!isTauri) return;
  const state = useAppStore.getState();
  for (const tab of state.tabs) {
    if (tab.path.startsWith('untitled-')) continue;
    try {
      // get_file_info errors out if the path doesn't exist.
      await tauriInvoke('get_file_info', { path: tab.path });
      if (tab.missing) state.setTabMissing(tab.id, false);
    } catch {
      if (!tab.missing) state.setTabMissing(tab.id, true);
    }
  }
}

export function useSession() {
  const hasRestored = useRef(false);

  // Restore on mount
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;
    restoreSessionFromDisk();
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveSessionAsync, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync removed: manual refresh via the ↺ button in the file tree header.

  // Save on beforeunload
  useEffect(() => {
    const handler = () => saveSessionSync();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Tauri: save before window closes
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('tauri://close-requested', async () => {
        await saveSessionAsync();
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().close();
        } catch { /* fallback */ }
      }).then(fn => { unlisten = fn; });
    });

    return () => { unlisten?.(); };
  }, []);
}
