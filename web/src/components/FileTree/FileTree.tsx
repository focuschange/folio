import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { FileIcon, FolderIcon, isEditableFile } from '../../utils/fileIcons';
import { ChevronRight, ChevronDown, ChevronLeft, Filter, ChevronsDownUp, ChevronsUpDown, FolderPlus, X, Eye, EyeOff, RotateCw } from 'lucide-react';
import type { FileEntry, EditorTab } from '../../types';
import { FileTreeContextMenu, type ContextMenuItem } from './FileTreeContextMenu';
import { PromptDialog } from './PromptDialog';
import { setCurrentDrag, getCurrentDrag, clearCurrentDrag } from '../../utils/dragState';

interface DragState {
  setDragOverPath: (path: string | null) => void;
  dragOverPath: string | null;
}

interface OpenContextMenu {
  x: number;
  y: number;
  entry: FileEntry;
}

// Detect whether `target` is `src` itself or a descendant of `src` (so we can refuse drops onto self/children).
function isSelfOrDescendant(src: string, target: string): boolean {
  if (src === target) return true;
  return target.startsWith(src.endsWith('/') ? src : src + '/');
}

// Find which project root contains the given path (for refresh after move).
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

// Thin horizontal line shown between roots to indicate where a root reorder will land.
function DropIndicator() {
  return <div className="h-0.5 mx-2 my-px rounded bg-blue-500/80" />;
}

// Whether this tab's file lives inside one of the project roots.
function isInsideAnyRoot(path: string, roots: string[]): boolean {
  if (path.startsWith('untitled-')) return false;
  for (const root of roots) {
    if (path === root) return true;
    if (path.startsWith(root.endsWith('/') ? root : root + '/')) return true;
  }
  return false;
}

function TreeNode({
  entry,
  depth = 0,
  dragState,
  onContextMenu,
  onDropOnDir,
}: {
  entry: FileEntry;
  depth?: number;
  dragState: DragState;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onDropOnDir: (e: React.DragEvent, targetDir: string) => void;
}) {
  const theme = useAppStore(s => s.settings.theme);
  const expandedDirs = useAppStore(s => s.expandedDirs);
  const selectedPath = useAppStore(s => s.selectedPath);
  const toggleDir = useAppStore(s => s.toggleDir);
  const setSelectedPath = useAppStore(s => s.setSelectedPath);
  const gitStatus = useAppStore(s => s.gitStatus);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const { openFileInEditor } = useFileSystem();

  const isExpanded = expandedDirs.has(entry.path);
  const isSelected = selectedPath === entry.path;
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const selectedBg = isSelected ? (theme === 'dark' ? 'bg-zinc-700/70' : 'bg-blue-50') : '';

  // Open-tab indication
  const openTab = tabs.find(t => t.path === entry.path);
  const isOpen = !!openTab;
  const isActive = openTab?.id === activeTabId;
  const isDirty = openTab?.dirty ?? false;
  const openText = isActive
    ? (theme === 'dark' ? 'text-blue-300 font-semibold' : 'text-blue-600 font-semibold')
    : isOpen
      ? (theme === 'dark' ? 'text-zinc-100 font-medium' : 'text-zinc-900 font-medium')
      : '';

  // Git status color
  const gitEntry = gitStatus.find(g => entry.path.endsWith(g.path));
  let gitColor = '';
  if (gitEntry) {
    switch (gitEntry.status) {
      case 'added': case 'untracked': gitColor = 'text-green-400'; break;
      case 'modified': gitColor = 'text-yellow-400'; break;
      case 'deleted': gitColor = 'text-red-400'; break;
    }
  }

  // Hidden file / build-artifact color (muted, italic)
  const hiddenStyle = entry.isHidden
    ? (theme === 'dark' ? 'text-zinc-500 italic' : 'text-zinc-400 italic')
    : '';

  const editable = entry.isDir || isEditableFile(entry.name);

  const handleClick = () => {
    setSelectedPath(entry.path);
    if (entry.isDir) {
      toggleDir(entry.path);
    }
    // Files: single-click only selects. Double-click to open.
  };

  const handleDoubleClick = () => {
    if (!entry.isDir && editable) {
      openFileInEditor(entry.path, entry.name);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    // Stop bubbling so the multi-root wrapper's dragstart (which reorders project roots)
    // doesn't also fire when dragging a sub-node.
    e.stopPropagation();
    setCurrentDrag({ kind: 'tree', path: entry.path });
    try {
      e.dataTransfer.setData('text/plain', entry.path);
    } catch {
      // ignore
    }
  };
  const handleDragEndNode = () => clearCurrentDrag();

  const isDragOver = dragState.dragOverPath === entry.path;
  const dragOverBg = isDragOver
    ? (theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100')
    : '';

  // Directories are drop targets. We always accept dragover (some webviews hide custom
  // MIMEs during dragover; the actual MIME validation happens in onDrop).
  const handleDragOver = (e: React.DragEvent) => {
    if (!entry.isDir) return;
    const payload = getCurrentDrag();
    // Always preventDefault so drop will fire — root reorder drags are handled at the
    // tree-container level, but we still need this element to be a drop target so the
    // event reaches the container. Skip only the highlight side-effect for root drags.
    e.preventDefault();
    if (payload?.kind === 'root') return;
    e.dataTransfer.dropEffect = 'move';
    dragState.setDragOverPath(entry.path);
  };

  const handleDragLeave = () => {
    if (dragState.dragOverPath === entry.path) dragState.setDragOverPath(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!entry.isDir) return;
    const payload = getCurrentDrag();
    // Always preventDefault so the browser doesn't perform a default text drop.
    e.preventDefault();
    if (payload?.kind === 'root') return; // let the drop bubble to the container
    e.stopPropagation();
    dragState.setDragOverPath(null);
    onDropOnDir(e, entry.path);
  };

  return (
    <div>
      <div
        data-tree-path={entry.path}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEndNode}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={(e) => onContextMenu(e, entry)}
        className={`flex items-center gap-1 py-0.5 pr-2 text-sm select-none ${hoverBg} ${selectedBg} ${dragOverBg} ${gitColor} ${openText} transition-colors ${editable ? 'cursor-pointer' : 'cursor-default opacity-40'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {entry.isDir ? (
          <>
            {isExpanded ? (
              <ChevronDown size={14} className="shrink-0 opacity-60" />
            ) : (
              <ChevronRight size={14} className="shrink-0 opacity-60" />
            )}
            <FolderIcon isOpen={isExpanded} size={15} />
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0 flex items-center justify-center">
              {isOpen && (
                <span
                  className={`block w-1.5 h-1.5 rounded-full ${
                    isDirty ? 'bg-orange-400' : isActive ? 'bg-blue-400' : 'bg-zinc-400'
                  }`}
                  title={isDirty ? '수정됨' : '열려 있음'}
                />
              )}
            </span>
            <FileIcon name={entry.name} size={15} />
          </>
        )}
        <span className={`truncate text-[13px] ${hiddenStyle}`}>{entry.name}</span>
      </div>
      {entry.isDir && isExpanded && entry.children && (
        <div>
          {entry.children
            .sort((a, b) => {
              if (a.isDir && !b.isDir) return -1;
              if (!a.isDir && b.isDir) return 1;
              return a.name.localeCompare(b.name);
            })
            .map(child => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                dragState={dragState}
                onContextMenu={onContextMenu}
                onDropOnDir={onDropOnDir}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function RootHeader({
  entry,
  theme,
  dragState,
  onDropOnDir,
  onContextMenu,
  rootIndex,
}: {
  entry: FileEntry;
  theme: string;
  dragState: DragState;
  onDropOnDir: (e: React.DragEvent, targetDir: string) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  rootIndex: number;
}) {
  const expandedDirs = useAppStore(s => s.expandedDirs);
  const toggleDir = useAppStore(s => s.toggleDir);
  const removeProjectRoot = useAppStore(s => s.removeProjectRoot);
  const projectRoots = useAppStore(s => s.projectRoots);
  const isExpanded = expandedDirs.has(entry.path);
  const showRemove = projectRoots.length > 1;
  const isDragOver = dragState.dragOverPath === entry.path;
  const dragOverBg = isDragOver ? (theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100') : '';

  // Accept dragover for file/tab drops INTO this root.
  const handleDragOver = (e: React.DragEvent) => {
    const payload = getCurrentDrag();
    // For root reorder drags we still need to preventDefault so the drop event will
    // fire (otherwise WebKit treats the default text drop as a navigation/insert).
    // We only skip the highlight + dropEffect side-effects.
    e.preventDefault();
    if (payload?.kind === 'root') return;
    e.dataTransfer.dropEffect = 'move';
    dragState.setDragOverPath(entry.path);
  };
  const handleDragLeave = () => {
    if (dragState.dragOverPath === entry.path) dragState.setDragOverPath(null);
  };
  const handleDrop = (e: React.DragEvent) => {
    const payload = getCurrentDrag();
    // Always preventDefault to suppress the browser's default drop action.
    e.preventDefault();
    if (payload?.kind === 'root') return; // let the drop bubble to the container
    e.stopPropagation();
    dragState.setDragOverPath(null);
    onDropOnDir(e, entry.path);
  };

  return (
    <div
      data-root-header={rootIndex}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => onContextMenu(e, entry)}
      className={`flex items-center gap-1 px-2 py-1.5 text-xs font-bold cursor-pointer select-none ${dragOverBg} ${
        theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'
      }`}
      onClick={() => toggleDir(entry.path)}
    >
      {isExpanded ? <ChevronDown size={14} className="shrink-0 opacity-60" /> : <ChevronRight size={14} className="shrink-0 opacity-60" />}
      <FolderIcon isOpen={isExpanded} size={15} />
      <span className="truncate flex-1">{entry.name}</span>
      {showRemove && (
        <button
          className={`p-0.5 rounded opacity-0 group-hover:opacity-100 hover:opacity-100 ${
            theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'
          }`}
          style={{ opacity: undefined }}
          onClick={(e) => {
            e.stopPropagation();
            removeProjectRoot(entry.path);
          }}
          title="Remove from workspace"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

export function FileTree() {
  const theme = useAppStore(s => s.settings.theme);
  const showHiddenFiles = useAppStore(s => s.settings.showHiddenFiles);
  const updateSettings = useAppStore(s => s.updateSettings);
  const fileTree = useAppStore(s => s.fileTree);
  const projectRoot = useAppStore(s => s.projectRoot);
  const projectRoots = useAppStore(s => s.projectRoots);
  const expandedDirs = useAppStore(s => s.expandedDirs);
  const collapseAllDirs = useAppStore(s => s.collapseAllDirs);
  const expandAllDirs = useAppStore(s => s.expandAllDirs);
  const reorderProjectRoots = useAppStore(s => s.reorderProjectRoots);
  const resizeSidebar = useAppStore(s => s.resizeSidebar);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const updateTabPath = useAppStore(s => s.updateTabPath);
  const showRightPanelTab = useAppStore(s => s.showRightPanelTab);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const closeTab = useAppStore(s => s.closeTab);
  const setSelectedPath = useAppStore(s => s.setSelectedPath);
  const expandToPath = useAppStore(s => s.expandToPath);

  const [filter, setFilter] = useState('');
  const [rootDragIndex, setRootDragIndex] = useState<number | null>(null);
  // 0..N where N = number of roots (drop AFTER all). null = no active drop target.
  // Stored as a ref so the drop handler always reads the latest value (the React state
  // updated by `dragover` may still be batched when `drop` fires immediately after).
  const rootDropTargetRef = useRef<number | null>(null);
  const [rootDropTarget, setRootDropTarget] = useState<number | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<OpenContextMenu | null>(null);
  // In-app prompt dialog (replaces window.prompt which doesn't work in WKWebView).
  const [promptDialog, setPromptDialog] = useState<{
    title: string;
    defaultValue: string;
    onConfirm: (value: string) => void;
  } | null>(null);
  const showPrompt = useCallback((title: string, defaultValue: string, onConfirm: (value: string) => void) => {
    setPromptDialog({ title, defaultValue, onConfirm });
  }, []);
  const isAllCollapsed = expandedDirs.size === 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    openFolder, openFileInEditor, refreshDirectory, renameEntry,
    deleteEntry, createFile, createDirectory, writeFile,
  } = useFileSystem();

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const dragState: DragState = useMemo(() => ({ dragOverPath, setDragOverPath }), [dragOverPath]);

  // --- Window-level safety net for drag cleanup ---
  // Some webviews don't always fire `dragend` on the source (e.g., when the drag is
  // cancelled by releasing outside any drop target). Listen on window so root reorder
  // state is always cleared, preventing stale `rootDragIndex` from corrupting subsequent drags.
  useEffect(() => {
    const onDragEnd = () => {
      setRootDragIndex(null);
      setRootDropTarget(null);
      rootDropTargetRef.current = null;
      clearCurrentDrag();
    };
    window.addEventListener('dragend', onDragEnd);
    return () => window.removeEventListener('dragend', onDragEnd);
  }, []);

  // --- Reveal active tab in tree ---
  // When the active tab changes, expand all ancestor directories so the file
  // becomes visible, mark it as selected, and scroll it into view.
  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;
  const activePath = activeTab?.path ?? null;
  const isActiveExternal = activePath && !isInsideAnyRoot(activePath, projectRoots);

  useEffect(() => {
    if (!activePath) return;
    if (isActiveExternal) return; // not in tree → nothing to expand/scroll
    expandToPath(activePath);
    setSelectedPath(activePath);
    // Scroll the matching node into view on the next frame (after expand re-renders).
    const id = window.requestAnimationFrame(() => {
      const node = containerRef.current?.querySelector<HTMLElement>(
        `[data-tree-path="${CSS.escape(activePath)}"]`,
      );
      if (node) node.scrollIntoView({ block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [activePath, isActiveExternal, expandToPath, setSelectedPath]);

  // --- Tree refresh helper ---

  const refreshRootForPath = useCallback(async (path: string) => {
    const root = findRootFor(path, projectRoots);
    if (root) await refreshDirectory(root);
  }, [projectRoots, refreshDirectory]);

  const toggleHiddenFiles = useCallback(async () => {
    // updateSettings writes to the store synchronously; refreshDirectory reads
    // the latest value via getState() so the updated flag is already visible.
    updateSettings({ showHiddenFiles: !showHiddenFiles });
    for (const root of projectRoots) {
      await refreshDirectory(root);
    }
  }, [showHiddenFiles, updateSettings, projectRoots, refreshDirectory]);

  const reloadAllRoots = useCallback(async () => {
    for (const root of projectRoots) {
      await refreshDirectory(root);
    }
  }, [projectRoots, refreshDirectory]);

  // --- Drop handler (file moves and tab drops) ---

  const handleDropOnDir = useCallback(async (_e: React.DragEvent, targetDir: string) => {
    const payload = getCurrentDrag();
    clearCurrentDrag();
    if (!payload) return;

    if (payload.kind === 'tab') {
      const tab = tabs.find(t => t.id === payload.tabId);
      if (!tab) return;
      const isUntitled = tab.path.startsWith('untitled-');
      if (isUntitled) {
        // Save As into target dir
        if (!isTauri) return;
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const defaultName = tab.name === 'Untitled' ? 'untitled.txt' : tab.name;
          // Pass directory and filename SEPARATELY — macOS treats `/` in the filename
          // field as a literal character (rendered as `:`), so the full path must not be
          // passed as `defaultName`.
          const selected = await invoke<string | null>('save_file_dialog', {
            defaultName,
            defaultDir: targetDir,
          });
          if (!selected) return;
          const ok = await writeFile(selected, tab.content);
          if (ok) {
            const newName = selected.split('/').pop() ?? tab.name;
            updateTabPath(tab.id, selected, newName);
            useAppStore.getState().markTabClean(tab.id);
            await refreshRootForPath(selected);
          }
        } catch (err) {
          console.error('Save As failed:', err);
        }
      } else {
        const newPath = joinPath(targetDir, tab.name);
        if (newPath === tab.path) return;
        const ok = await renameEntry(tab.path, newPath);
        if (ok) {
          updateTabPath(tab.id, newPath);
          await refreshRootForPath(tab.path);
          if (findRootFor(newPath, projectRoots) !== findRootFor(tab.path, projectRoots)) {
            await refreshRootForPath(newPath);
          }
        }
      }
      return;
    }

    // Tree node move (root drags are handled at the wrapper level — ignore here)
    if (payload.kind !== 'tree') return;
    const srcPath = payload.path;
    if (isSelfOrDescendant(srcPath, targetDir)) return;
    const baseName = srcPath.split('/').pop() ?? '';
    if (!baseName) return;
    const newPath = joinPath(targetDir, baseName);
    if (newPath === srcPath) return;
    const ok = await renameEntry(srcPath, newPath);
    if (ok) {
      const movedTabs = tabs.filter(t => t.path === srcPath || t.path.startsWith(srcPath + '/'));
      for (const t of movedTabs) {
        const remainder = t.path === srcPath ? '' : t.path.slice(srcPath.length);
        updateTabPath(t.id, newPath + remainder);
      }
      await refreshRootForPath(srcPath);
      if (findRootFor(newPath, projectRoots) !== findRootFor(srcPath, projectRoots)) {
        await refreshRootForPath(newPath);
      }
    }
  }, [tabs, isTauri, writeFile, updateTabPath, refreshRootForPath, renameEntry, projectRoots]);

  // --- Context menu ---

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, entry });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const buildContextMenu = useCallback((entry: FileEntry): ContextMenuItem[] => {
    if (entry.isDir) {
      return [
        {
          kind: 'item', label: '새 파일', onClick: () => {
            showPrompt('새 파일 이름', 'untitled.txt', async (name) => {
              const ok = await createFile(entry.path, name);
              if (ok) await refreshDirectory(findRootFor(entry.path, projectRoots) ?? entry.path);
            });
          },
        },
        {
          kind: 'item', label: '새 폴더', onClick: () => {
            showPrompt('새 폴더 이름', 'new-folder', async (name) => {
              const ok = await createDirectory(entry.path, name);
              if (ok) await refreshDirectory(findRootFor(entry.path, projectRoots) ?? entry.path);
            });
          },
        },
        { kind: 'separator' },
        {
          kind: 'item', label: '이름 바꾸기', onClick: () => {
            showPrompt('새 이름', entry.name, async (newName) => {
              if (newName === entry.name) return;
              const parent = entry.path.split('/').slice(0, -1).join('/');
              const newPath = joinPath(parent, newName);
              const ok = await renameEntry(entry.path, newPath);
              if (ok) await refreshRootForPath(entry.path);
            });
          },
        },
        {
          kind: 'item', label: '경로 복사', onClick: async () => {
            try { await navigator.clipboard.writeText(entry.path); } catch (e) { console.error(e); }
          },
        },
        { kind: 'separator' },
        {
          kind: 'item', label: '삭제', danger: true, onClick: async () => {
            if (!window.confirm(`"${entry.name}" 디렉토리를 삭제할까요? (포함된 모든 파일이 삭제됩니다)`)) return;
            const ok = await deleteEntry(entry.path);
            if (ok) await refreshRootForPath(entry.path);
          },
        },
      ];
    }
    // File
    return [
      {
        kind: 'item', label: '열기', onClick: () => openFileInEditor(entry.path, entry.name),
      },
      {
        kind: 'item', label: '다른 이름으로 저장…', onClick: async () => {
          if (!isTauri) return;
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            const selected = await invoke<string | null>('save_file_dialog', { defaultName: entry.name });
            if (!selected) return;
            const { invoke: invoke2 } = await import('@tauri-apps/api/core');
            const content = await invoke2<string>('read_file', { path: entry.path });
            const ok = await writeFile(selected, content);
            if (ok) await refreshRootForPath(selected);
          } catch (err) {
            console.error('Save As failed:', err);
          }
        },
      },
      { kind: 'separator' },
      {
        kind: 'item', label: '이름 바꾸기', onClick: () => {
          showPrompt('새 이름', entry.name, async (newName) => {
            if (newName === entry.name) return;
            const parent = entry.path.split('/').slice(0, -1).join('/');
            const newPath = joinPath(parent, newName);
            const ok = await renameEntry(entry.path, newPath);
            if (ok) {
              const tab = tabs.find(t => t.path === entry.path);
              if (tab) updateTabPath(tab.id, newPath, newName);
              await refreshRootForPath(entry.path);
            }
          });
        },
      },
      {
        kind: 'item', label: '경로 복사', onClick: async () => {
          try { await navigator.clipboard.writeText(entry.path); } catch (e) { console.error(e); }
        },
      },
      { kind: 'separator' },
      {
        kind: 'item', label: '정보 보기', onClick: () => {
          // Activate the file as the current tab so FileInfoPanel reflects it
          const tab = tabs.find(t => t.path === entry.path);
          if (tab) {
            setActiveTab(tab.id);
          } else {
            // Open it (FileInfoPanel uses activeTab.path)
            openFileInEditor(entry.path, entry.name);
          }
          setSelectedPath(entry.path);
          showRightPanelTab('info');
        },
      },
      { kind: 'separator' },
      {
        kind: 'item', label: '삭제', danger: true, onClick: async () => {
          if (!window.confirm(`"${entry.name}" 파일을 삭제할까요?`)) return;
          const ok = await deleteEntry(entry.path);
          if (ok) await refreshRootForPath(entry.path);
        },
      },
    ];
  }, [
    isTauri, tabs, projectRoots, refreshDirectory, refreshRootForPath, renameEntry,
    deleteEntry, createFile, createDirectory, writeFile, openFileInEditor,
    updateTabPath, showRightPanelTab, setActiveTab, setSelectedPath, showPrompt,
  ]);

  // --- Filter ---

  const filterTree = useCallback((entries: FileEntry[], query: string): FileEntry[] => {
    if (!query) return entries;
    const lower = query.toLowerCase();
    return entries
      .map(entry => {
        if (entry.isDir && entry.children) {
          const filtered = filterTree(entry.children, query);
          if (filtered.length > 0) return { ...entry, children: filtered };
        }
        if (entry.name.toLowerCase().includes(lower)) return entry;
        return null;
      })
      .filter(Boolean) as FileEntry[];
  }, []);

  const filteredTree = filterTree(fileTree, filter);
  const rootName = projectRoot?.split('/').pop() || 'Explorer';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const isMultiRoot = projectRoots.length > 1;

  return (
    <div ref={containerRef} className={`h-full flex flex-col overflow-hidden ${
      theme === 'dark' ? 'bg-zinc-900' : 'bg-white'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ${textMuted}`}>
        <span className="truncate">{rootName}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => resizeSidebar(-80)}
            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            title="Narrow Sidebar (⌘⌥←)"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => resizeSidebar(80)}
            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            title="Widen Sidebar (⌘⌥→)"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={reloadAllRoots}
            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            title="새로고침"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={isAllCollapsed ? expandAllDirs : collapseAllDirs}
            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            title={isAllCollapsed ? "Expand All" : "Collapse All"}
          >
            {isAllCollapsed ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
          </button>
          <button
            onClick={toggleHiddenFiles}
            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700 hover:text-zinc-300' : 'hover:bg-zinc-200 hover:text-zinc-600'} ${
              showHiddenFiles
                ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500')
                : (theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')
            }`}
            title={showHiddenFiles ? "숨김파일 숨기기" : "숨김파일 표시"}
          >
            {showHiddenFiles ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={openFolder}
            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            title="Add Folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="px-2 pb-2">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm ${
          theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
        }`}>
          <Filter size={12} className="opacity-50 shrink-0" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter files..."
            className="bg-transparent outline-none flex-1 text-xs placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Open Editors — files outside any project root (incl. untitled) */}
      <OpenEditorsSection
        tabs={tabs}
        activeTabId={activeTabId}
        projectRoots={projectRoots}
        theme={theme}
        textMuted={textMuted}
        onActivate={(id) => setActiveTab(id)}
        onClose={(id) => closeTab(id)}
        onShowInfo={(id) => { setActiveTab(id); showRightPanelTab('info'); }}
      />

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onDragOver={(e) => {
          // Container-level dragover handles root reorder: compute insert index based
          // on cursor Y vs each ROOT HEADER's midpoint (excluding children sub-tree).
          const payload = getCurrentDrag();
          if (payload?.kind !== 'root') return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const headers = (e.currentTarget as HTMLElement)
            .querySelectorAll<HTMLElement>('[data-root-header]');
          let insertIdx = headers.length; // default: drop at the very end
          for (let i = 0; i < headers.length; i++) {
            const rect = headers[i].getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) {
              insertIdx = i;
              break;
            }
          }
          // Update ref synchronously so the drop handler sees the latest value even
          // if React hasn't flushed the corresponding state update yet.
          rootDropTargetRef.current = insertIdx;
          if (insertIdx !== rootDropTarget) setRootDropTarget(insertIdx);
        }}
        onDrop={(e) => {
          const payload = getCurrentDrag();
          if (payload?.kind !== 'root') return;
          e.preventDefault();
          const fromIdx = payload.index;
          const target = rootDropTargetRef.current;
          if (target !== null) {
            // When inserting at insertIdx, removing the source first shifts subsequent
            // items left, so adjust the destination if the source is BEFORE the target.
            let to = target;
            if (fromIdx < to) to -= 1;
            if (to !== fromIdx && to >= 0) {
              reorderProjectRoots(fromIdx, to);
            }
          }
          rootDropTargetRef.current = null;
          setRootDropTarget(null);
          setRootDragIndex(null);
          clearCurrentDrag();
        }}
      >
        {filteredTree.length === 0 ? (
          <div className={`px-3 py-4 text-center text-xs ${textMuted}`}>
            {fileTree.length === 0 ? 'Open a folder to get started' : 'No matching files'}
          </div>
        ) : isMultiRoot ? (
          <>
            {filteredTree.map((rootEntry, rootIndex) => {
              const isDragging = rootDragIndex === rootIndex;
              const showIndicatorBefore = rootDropTarget === rootIndex;
              return (
                <div key={rootEntry.path}>
                  {showIndicatorBefore && <DropIndicator />}
                  <div
                    draggable
                    onDragStart={(e) => {
                      // Stop bubbling so children's drag handlers don't run.
                      e.stopPropagation();
                      // Clear any stale state from a previous, possibly-cancelled drag.
                      rootDropTargetRef.current = null;
                      setRootDropTarget(null);
                      setRootDragIndex(rootIndex);
                      setCurrentDrag({ kind: 'root', index: rootIndex });
                      try { e.dataTransfer.setData('text/plain', rootEntry.path); } catch { /* ignore */ }
                    }}
                    onDragEnd={() => {
                      setRootDragIndex(null);
                      rootDropTargetRef.current = null;
                      setRootDropTarget(null);
                      clearCurrentDrag();
                    }}
                    className={`group ${isDragging ? 'opacity-50' : ''}`}
                  >
                    <RootHeader
                      entry={rootEntry}
                      theme={theme}
                      dragState={dragState}
                      onDropOnDir={handleDropOnDir}
                      onContextMenu={handleContextMenu}
                      rootIndex={rootIndex}
                    />
                    {expandedDirs.has(rootEntry.path) && rootEntry.children && (
                      <div>
                        {rootEntry.children
                          .sort((a, b) => {
                            if (a.isDir && !b.isDir) return -1;
                            if (!a.isDir && b.isDir) return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map(child => (
                            <TreeNode
                              key={child.path}
                              entry={child}
                              depth={1}
                              dragState={dragState}
                              onContextMenu={handleContextMenu}
                              onDropOnDir={handleDropOnDir}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {rootDropTarget === filteredTree.length && <DropIndicator />}
          </>
        ) : (
          // Single root: show children of root directly (root itself shown in header)
          (filteredTree.length === 1 && filteredTree[0].isDir && filteredTree[0].children
            ? filteredTree[0].children
            : filteredTree
          )
            .sort((a, b) => {
              if (a.isDir && !b.isDir) return -1;
              if (!a.isDir && b.isDir) return 1;
              return a.name.localeCompare(b.name);
            })
            .map(entry => (
              <TreeNode
                key={entry.path}
                entry={entry}
                dragState={dragState}
                onContextMenu={handleContextMenu}
                onDropOnDir={handleDropOnDir}
              />
            ))
        )}
      </div>

      {contextMenu && (
        <FileTreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextMenu(contextMenu.entry)}
          onClose={closeContextMenu}
        />
      )}

      <PromptDialog
        open={!!promptDialog}
        title={promptDialog?.title ?? ''}
        defaultValue={promptDialog?.defaultValue ?? ''}
        onConfirm={(value) => {
          const cb = promptDialog?.onConfirm;
          setPromptDialog(null);
          cb?.(value);
        }}
        onCancel={() => setPromptDialog(null)}
      />
    </div>
  );
}

// Section that lists tabs whose files are outside any project root (or untitled).
// Rendered above the regular tree, similar to VS Code's "Open Editors" view but
// limited to "external" files only — files inside a project root already appear
// in the tree itself (with the bold + dot indicator).
function OpenEditorsSection({
  tabs, activeTabId, projectRoots, theme, textMuted,
  onActivate, onClose, onShowInfo,
}: {
  tabs: EditorTab[];
  activeTabId: string | null;
  projectRoots: string[];
  theme: string;
  textMuted: string;
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onShowInfo: (tabId: string) => void;
}) {
  const externals = tabs.filter(t => !isInsideAnyRoot(t.path, projectRoots));
  const [menu, setMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  if (externals.length === 0) return null;

  const itemHover = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const activeBg = theme === 'dark' ? 'bg-zinc-700/70' : 'bg-blue-50';
  const headerBorder = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';

  return (
    <div className={`shrink-0 border-b ${headerBorder}`}>
      <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>
        Open Editors
      </div>
      <div className="max-h-[120px] overflow-y-auto">
        {externals.map(t => {
          const isActive = t.id === activeTabId;
          const isUntitled = t.path.startsWith('untitled-');
          const display = t.name + (t.dirty ? ' •' : '');
          const tooltip = t.missing ? `⚠ 파일이 사라졌습니다\n${t.path}`
            : (isUntitled ? '(저장되지 않은 파일)' : t.path);
          const activeText = isActive
            ? (theme === 'dark' ? 'text-blue-300 font-semibold' : 'text-blue-600 font-semibold')
            : (t.missing ? 'text-amber-500 line-through' : '');
          return (
            <div
              key={t.id}
              onClick={() => onActivate(t.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenu({ x: e.clientX, y: e.clientY, tabId: t.id });
              }}
              title={tooltip}
              className={`flex items-center gap-1.5 px-3 py-0.5 text-[13px] cursor-pointer ${itemHover} ${isActive ? activeBg : ''} ${activeText}`}
            >
              <FileIcon name={t.name} size={14} />
              <span className="truncate flex-1">{display}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(t.id); }}
                className={`p-0.5 rounded shrink-0 ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
                title="탭 닫기"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>
      {menu && (
        <FileTreeContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { kind: 'item', label: '활성화', onClick: () => onActivate(menu.tabId) },
            { kind: 'item', label: '정보 보기', onClick: () => onShowInfo(menu.tabId) },
            { kind: 'separator' },
            { kind: 'item', label: '탭 닫기', danger: true, onClick: () => onClose(menu.tabId) },
          ]}
        />
      )}
    </div>
  );
}
