import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { FileIcon, FolderIcon, isEditableFile } from '../../utils/fileIcons';
import { ChevronRight, ChevronDown, ChevronLeft, Filter, ChevronsDownUp, ChevronsUpDown, FolderPlus, X, Eye, EyeOff, RotateCw } from 'lucide-react';
import type { FileEntry, EditorTab } from '../../types';
import { FileTreeContextMenu, type ContextMenuItem } from './FileTreeContextMenu';
import { PromptDialog } from './PromptDialog';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { encodeDragId, encodeDropId, decodeDragId, decodeDropId } from '../../hooks/useGlobalDnD';

interface OpenContextMenu {
  x: number;
  y: number;
  entry: FileEntry;
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
  onContextMenu,
}: {
  entry: FileEntry;
  depth?: number;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
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

  // @dnd-kit — every node is draggable; directories are also droppable.
  const dragId = encodeDragId({ kind: 'tree', path: entry.path });
  const {
    attributes, listeners, setNodeRef: setDragRef, transform, isDragging,
  } = useDraggable({ id: dragId, data: { kind: 'tree', path: entry.path } });

  const dropId = encodeDropId({ kind: 'dir', path: entry.path });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: dropId,
    disabled: !entry.isDir,
    data: { kind: 'dir', path: entry.path },
  });

  // Compose draggable+droppable refs onto the same element.
  const setNodeRef = (el: HTMLDivElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  const dragOverBg = isOver
    ? (theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100')
    : '';

  const style: React.CSSProperties = {
    paddingLeft: `${depth * 16 + 8}px`,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        data-tree-path={entry.path}
        {...attributes}
        {...listeners}
        onContextMenu={(e) => onContextMenu(e, entry)}
        className={`flex items-center gap-1 py-0.5 pr-2 text-sm select-none ${hoverBg} ${selectedBg} ${dragOverBg} ${gitColor} ${openText} transition-colors ${editable ? 'cursor-pointer' : 'cursor-default opacity-40'}`}
        style={style}
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
                onContextMenu={onContextMenu}
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
  onContextMenu,
  rootIndex,
}: {
  entry: FileEntry;
  theme: string;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  rootIndex: number;
}) {
  const expandedDirs = useAppStore(s => s.expandedDirs);
  const toggleDir = useAppStore(s => s.toggleDir);
  const removeProjectRoot = useAppStore(s => s.removeProjectRoot);
  const projectRoots = useAppStore(s => s.projectRoots);
  const isExpanded = expandedDirs.has(entry.path);
  const showRemove = projectRoots.length > 1;

  // The root header is droppable (target for tab/tree drops into this root dir).
  // Root reorder draggable is the parent wrapper (see RootWrapper), not this header.
  const dropId = encodeDropId({ kind: 'root', path: entry.path, index: rootIndex });
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { kind: 'root', path: entry.path, index: rootIndex },
  });

  // Only show the "drop INTO this root dir" highlight when the dragged item is
  // a tab or a tree node — NOT when reordering roots themselves (that gets a
  // thin line indicator at SortableRoot level instead).
  const { active } = useDndContext();
  const activeKind = active ? decodeDragId(active.id as string)?.kind : null;
  const showRootDropHighlight = isOver && activeKind !== 'root-drag';
  const dragOverBg = showRootDropHighlight
    ? (theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100')
    : '';

  return (
    <div
      ref={setNodeRef}
      data-root-header={rootIndex}
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
        `[data-tree-path="${window.CSS.escape(activePath)}"]`,
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {filteredTree.length === 0 ? (
          <div className={`px-3 py-4 text-center text-xs ${textMuted}`}>
            {fileTree.length === 0 ? 'Open a folder to get started' : 'No matching files'}
          </div>
        ) : isMultiRoot ? (
          <SortableContext
            items={filteredTree.map((_, i) => encodeDragId({ kind: 'root-drag', index: i }))}
            strategy={verticalListSortingStrategy}
          >
            {filteredTree.map((rootEntry, rootIndex) => (
              <SortableRoot
                key={rootEntry.path}
                entry={rootEntry}
                rootIndex={rootIndex}
                theme={theme}
                expandedDirs={expandedDirs}
                onContextMenu={handleContextMenu}
              />
            ))}
          </SortableContext>
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
                onContextMenu={handleContextMenu}
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

// Sortable wrapper for a single project root: the whole block (header + expanded children)
// is the draggable item. The sub-tree's child TreeNodes use their own useDraggable since
// they are sortable-independent (we don't reorder within a root — children come from disk).
function SortableRoot({
  entry, rootIndex, theme, expandedDirs, onContextMenu,
}: {
  entry: FileEntry;
  rootIndex: number;
  theme: string;
  expandedDirs: Set<string>;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}) {
  const dragId = encodeDragId({ kind: 'root-drag', index: rootIndex });
  const {
    attributes, listeners, setNodeRef, transform, transition,
  } = useSortable({ id: dragId, data: { kind: 'root-drag', index: rootIndex } });

  // Drop indicator (thin blue line) — sourced from the DndContext directly so it
  // works regardless of which droppable id wins the collision (sortable's own id
  // vs RootHeader's `root:<idx>:<path>` droppable id, both registered in this row).
  const { active, over } = useDndContext();
  const activeDrag = active ? decodeDragId(active.id as string) : null;

  // Visual policy during root reorder drag:
  //  - Source row: shown AS-IS (no transform/opacity). DragOverlay provides the
  //    follow-the-cursor preview; the source staying put is what the user wants.
  //  - Other rows: NO slide animation — the indicator line marks the drop pos.
  const isRootReorderActive = activeDrag?.kind === 'root-drag';
  const style: React.CSSProperties = isRootReorderActive
    ? {} // freeze layout — no transform/transition during root reorder
    : { transform: CSS.Transform.toString(transform), transition };
  const overDrop = over ? (decodeDropId(over.id as string) ?? decodeDragId(over.id as string)) : null;
  let activeIdx = -1;
  let overIdx = -1;
  if (activeDrag?.kind === 'root-drag') {
    activeIdx = activeDrag.index;
    if (overDrop && 'kind' in overDrop) {
      if (overDrop.kind === 'root') overIdx = overDrop.index;
      else if (overDrop.kind === 'root-drag') overIdx = overDrop.index;
    }
  }
  const isReorderingThisOver = activeIdx >= 0 && overIdx === rootIndex && activeIdx !== overIdx;
  const indicatorAbove = isReorderingThisOver && activeIdx > overIdx;
  const indicatorBelow = isReorderingThisOver && activeIdx < overIdx;

  // The whole sortable item must use setNodeRef (so the transform applies),
  // but the drag handle is ONLY the RootHeader row — child TreeNodes have their
  // own useDraggable and would otherwise hijack pointer-down events.
  return (
    <div ref={setNodeRef} style={style} className="group">
      {indicatorAbove && <div className="h-0.5 mx-2 my-px rounded bg-blue-500/80" />}
      <div {...attributes} {...listeners}>
        <RootHeader
          entry={entry}
          theme={theme}
          onContextMenu={onContextMenu}
          rootIndex={rootIndex}
        />
      </div>
      {/* "below" indicator sits directly under the header row (not after expanded
          children) so the line consistently appears at the actual insertion point
          — between two roots — regardless of expanded state. */}
      {indicatorBelow && <div className="h-0.5 mx-2 my-px rounded bg-blue-500/80" />}
      {expandedDirs.has(entry.path) && entry.children && (
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
                depth={1}
                onContextMenu={onContextMenu}
              />
            ))}
        </div>
      )}
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
