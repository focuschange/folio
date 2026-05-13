// Centralized drag&drop handler for the entire app.
// Migrated from HTML5 DnD to @dnd-kit (pointer-event based) so it coexists with
// Tauri v2 `dragDropEnabled: true` (which intercepts native HTML5 drag events on macOS).
//
// Covered DnD scenarios:
//  1. EditorTabs internal reorder      → id = `tab:<tabId>`
//  2. FileTree node move into a dir    → id = `tree:<path>` → drop on `dir:<targetDir>` or `root:<rootIndex>`
//  3. FileTree project root reorder    → id = `root-drag:<rootIndex>` → drop on `root-slot:<insertIdx>`
//  4. Cross-container: tab → FileTree  → id = `tab:<tabId>` → drop on `dir:<targetDir>` or `root:<rootIndex>`
//
// All IDs are encoded as strings with a `kind:` prefix so we can decode kind/payload uniformly.

import { useCallback } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useAppStore } from '../store/useAppStore';
import { useFileSystem } from './useFileSystem';

export type DragId =
  | { kind: 'tab'; tabId: string }
  | { kind: 'tree'; path: string }
  | { kind: 'root-drag'; index: number };

export type DropId =
  | { kind: 'tab-slot'; index: number }                // EditorTabs sortable slot
  | { kind: 'dir'; path: string }                       // FileTree directory node
  | { kind: 'root'; path: string; index: number }       // FileTree root header
  | { kind: 'root-slot'; index: number };               // FileTree root sortable slot

export function encodeDragId(d: DragId): string {
  if (d.kind === 'tab') return `tab:${d.tabId}`;
  if (d.kind === 'tree') return `tree:${d.path}`;
  return `root-drag:${d.index}`;
}

export function decodeDragId(id: string | number | undefined | null): DragId | null {
  if (typeof id !== 'string') return null;
  const i = id.indexOf(':');
  if (i < 0) return null;
  const kind = id.slice(0, i);
  const rest = id.slice(i + 1);
  if (kind === 'tab') return { kind: 'tab', tabId: rest };
  if (kind === 'tree') return { kind: 'tree', path: rest };
  if (kind === 'root-drag') return { kind: 'root-drag', index: parseInt(rest, 10) };
  return null;
}

export function encodeDropId(d: DropId): string {
  if (d.kind === 'tab-slot') return `tab-slot:${d.index}`;
  if (d.kind === 'dir') return `dir:${d.path}`;
  if (d.kind === 'root') return `root:${d.index}:${d.path}`;
  return `root-slot:${d.index}`;
}

export function decodeDropId(id: string | number | undefined | null): DropId | null {
  if (typeof id !== 'string') return null;
  const i = id.indexOf(':');
  if (i < 0) return null;
  const kind = id.slice(0, i);
  const rest = id.slice(i + 1);
  if (kind === 'tab-slot') return { kind: 'tab-slot', index: parseInt(rest, 10) };
  if (kind === 'dir') return { kind: 'dir', path: rest };
  if (kind === 'root') {
    const j = rest.indexOf(':');
    if (j < 0) return null;
    return { kind: 'root', index: parseInt(rest.slice(0, j), 10), path: rest.slice(j + 1) };
  }
  if (kind === 'root-slot') return { kind: 'root-slot', index: parseInt(rest, 10) };
  return null;
}

// Detect whether `target` is `src` itself or a descendant of `src`.
function isSelfOrDescendant(src: string, target: string): boolean {
  if (src === target) return true;
  return target.startsWith(src.endsWith('/') ? src : src + '/');
}

function findRootFor(path: string, roots: string[]): string | null {
  for (const root of roots) {
    if (path === root || path.startsWith(root.endsWith('/') ? root : root + '/')) {
      return root;
    }
  }
  return null;
}

function joinPath(dir: string, name: string): string {
  return dir.endsWith('/') ? dir + name : dir + '/' + name;
}

export interface UseGlobalDnDResult {
  onDragStart: (e: DragStartEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onDragCancel: () => void;
}

export function useGlobalDnD(): UseGlobalDnDResult {
  const { renameEntry, writeFile, refreshDirectory } = useFileSystem();
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const onDragStart = useCallback((_e: DragStartEvent) => {
    // Currently no-op; reserved for future UI highlight needs.
  }, []);

  const onDragCancel = useCallback(() => {
    // No-op.
  }, []);

  const onDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const drag = decodeDragId(active.id as string);
    // `over.id` can be either a Sortable item id (which equals a drag id, e.g. another tab)
    // or a dedicated droppable id (e.g. `dir:<path>`). Try the dedicated id space first,
    // then fall back to drag-id space (used for in-list sortable reorder).
    const drop = decodeDropId(over.id as string) ?? null;
    const dropAsDrag = drop ? null : decodeDragId(over.id as string);
    if (!drag || (!drop && !dropAsDrag)) return;

    const state = useAppStore.getState();

    // ---------------------------------------------------------------------
    // 1. EditorTabs reorder (sortable model — over.id is another tab id)
    // ---------------------------------------------------------------------
    if (drag.kind === 'tab' && dropAsDrag?.kind === 'tab') {
      const fromIdx = state.tabs.findIndex(t => t.id === drag.tabId);
      const toIdx = state.tabs.findIndex(t => t.id === dropAsDrag.tabId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
      state.reorderTabs(fromIdx, toIdx);
      return;
    }

    // ---------------------------------------------------------------------
    // 2. FileTree root reorder
    //    Two possible "over" id shapes when reordering roots:
    //    (a) another sortable root-drag id (when no droppable is registered on that row)
    //    (b) the RootHeader's `root:<idx>:<path>` droppable (we register both on the header)
    //    We honor either.
    // ---------------------------------------------------------------------
    if (drag.kind === 'root-drag' && dropAsDrag?.kind === 'root-drag') {
      const fromIdx = drag.index;
      const toIdx = dropAsDrag.index;
      if (fromIdx === toIdx) return;
      state.reorderProjectRoots(fromIdx, toIdx);
      return;
    }
    if (drag.kind === 'root-drag' && drop?.kind === 'root') {
      const fromIdx = drag.index;
      const toIdx = drop.index;
      if (fromIdx === toIdx) return;
      state.reorderProjectRoots(fromIdx, toIdx);
      return;
    }

    // Helper: refresh the project root containing `path`.
    const refreshRootForPath = async (path: string) => {
      const root = findRootFor(path, state.projectRoots);
      if (root) await refreshDirectory(root);
    };

    // ---------------------------------------------------------------------
    // 3. FileTree node → directory move
    //    (also accepts drop on root header — treated as drop into that root dir)
    // ---------------------------------------------------------------------
    if (drag.kind === 'tree' && drop && (drop.kind === 'dir' || drop.kind === 'root')) {
      const targetDir = drop.path;
      const srcPath = drag.path;
      if (isSelfOrDescendant(srcPath, targetDir)) return;
      const baseName = srcPath.split('/').pop() ?? '';
      if (!baseName) return;
      const newPath = joinPath(targetDir, baseName);
      if (newPath === srcPath) return;
      const ok = await renameEntry(srcPath, newPath);
      if (!ok) return;
      // Update any tabs whose paths sit under srcPath.
      const movedTabs = state.tabs.filter(
        t => t.path === srcPath || t.path.startsWith(srcPath + '/'),
      );
      for (const t of movedTabs) {
        const remainder = t.path === srcPath ? '' : t.path.slice(srcPath.length);
        state.updateTabPath(t.id, newPath + remainder);
      }
      await refreshRootForPath(srcPath);
      const srcRoot = findRootFor(srcPath, state.projectRoots);
      const dstRoot = findRootFor(newPath, state.projectRoots);
      if (srcRoot !== dstRoot) await refreshRootForPath(newPath);
      return;
    }

    // ---------------------------------------------------------------------
    // 4. Cross-container: EditorTab → FileTree directory (or root header)
    // ---------------------------------------------------------------------
    if (drag.kind === 'tab' && drop && (drop.kind === 'dir' || drop.kind === 'root')) {
      const targetDir = drop.path;
      const tab = state.tabs.find(t => t.id === drag.tabId);
      if (!tab) return;
      const isUntitled = tab.path.startsWith('untitled-');
      if (isUntitled) {
        if (!isTauri) return;
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const defaultName = tab.name === 'Untitled' ? 'untitled.txt' : tab.name;
          const selected = await invoke<string | null>('save_file_dialog', {
            defaultName,
            defaultDir: targetDir,
          });
          if (!selected) return;
          const ok = await writeFile(selected, tab.content);
          if (!ok) return;
          const newName = selected.split('/').pop() ?? tab.name;
          state.updateTabPath(tab.id, selected, newName);
          state.markTabClean(tab.id);
          await refreshRootForPath(selected);
        } catch (err) {
          console.error('Save As failed:', err);
        }
        return;
      }
      // Existing file → move into target dir.
      const newPath = joinPath(targetDir, tab.name);
      if (newPath === tab.path) return;
      const ok = await renameEntry(tab.path, newPath);
      if (!ok) return;
      state.updateTabPath(tab.id, newPath);
      await refreshRootForPath(tab.path);
      const srcRoot = findRootFor(tab.path, state.projectRoots);
      const dstRoot = findRootFor(newPath, state.projectRoots);
      if (srcRoot !== dstRoot) await refreshRootForPath(newPath);
      return;
    }
  }, [renameEntry, writeFile, refreshDirectory, isTauri]);

  return { onDragStart, onDragEnd, onDragCancel };
}
