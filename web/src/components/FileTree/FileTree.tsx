import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { FileIcon, FolderIcon, isEditableFile } from '../../utils/fileIcons';
import { ChevronRight, ChevronDown, Filter, ChevronsDownUp, ChevronsUpDown, FolderPlus, X } from 'lucide-react';
import type { FileEntry } from '../../types';

function TreeNode({ entry, depth = 0 }: { entry: FileEntry; depth?: number }) {
  const theme = useAppStore(s => s.settings.theme);
  const expandedDirs = useAppStore(s => s.expandedDirs);
  const selectedPath = useAppStore(s => s.selectedPath);
  const toggleDir = useAppStore(s => s.toggleDir);
  const setSelectedPath = useAppStore(s => s.setSelectedPath);
  const gitStatus = useAppStore(s => s.gitStatus);
  const { openFileInEditor } = useFileSystem();

  const isExpanded = expandedDirs.has(entry.path);
  const isSelected = selectedPath === entry.path;
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const selectedBg = isSelected ? (theme === 'dark' ? 'bg-zinc-700/70' : 'bg-blue-50') : '';

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

  const editable = entry.isDir || isEditableFile(entry.name);

  const handleClick = () => {
    setSelectedPath(entry.path);
    if (entry.isDir) {
      toggleDir(entry.path);
    } else if (editable) {
      openFileInEditor(entry.path, entry.name);
    }
  };

  const handleDoubleClick = () => {
    if (!entry.isDir && editable) {
      openFileInEditor(entry.path, entry.name);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 pr-2 text-sm select-none ${hoverBg} ${selectedBg} ${gitColor} transition-colors ${editable ? 'cursor-pointer' : 'cursor-default opacity-40'}`}
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
            <span className="w-3.5 shrink-0" />
            <FileIcon name={entry.name} size={15} />
          </>
        )}
        <span className="truncate text-[13px]">{entry.name}</span>
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
              <TreeNode key={child.path} entry={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

function RootHeader({ entry, theme }: { entry: FileEntry; theme: string }) {
  const expandedDirs = useAppStore(s => s.expandedDirs);
  const toggleDir = useAppStore(s => s.toggleDir);
  const removeProjectRoot = useAppStore(s => s.removeProjectRoot);
  const projectRoots = useAppStore(s => s.projectRoots);
  const isExpanded = expandedDirs.has(entry.path);
  const showRemove = projectRoots.length > 1;

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1.5 text-xs font-bold cursor-pointer select-none ${
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
  const fileTree = useAppStore(s => s.fileTree);
  const projectRoot = useAppStore(s => s.projectRoot);
  const projectRoots = useAppStore(s => s.projectRoots);
  const expandedDirs = useAppStore(s => s.expandedDirs);
  const collapseAllDirs = useAppStore(s => s.collapseAllDirs);
  const expandAllDirs = useAppStore(s => s.expandAllDirs);
  const reorderProjectRoots = useAppStore(s => s.reorderProjectRoots);
  const [filter, setFilter] = useState('');
  const [rootDragIndex, setRootDragIndex] = useState<number | null>(null);
  const isAllCollapsed = expandedDirs.size === 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const { openFolder } = useFileSystem();

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
            onClick={isAllCollapsed ? expandAllDirs : collapseAllDirs}
            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            title={isAllCollapsed ? "Expand All" : "Collapse All"}
          >
            {isAllCollapsed ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
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

      {/* Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {filteredTree.length === 0 ? (
          <div className={`px-3 py-4 text-center text-xs ${textMuted}`}>
            {fileTree.length === 0 ? 'Open a folder to get started' : 'No matching files'}
          </div>
        ) : isMultiRoot ? (
          filteredTree.map((rootEntry, rootIndex) => {
            const isDragging = rootDragIndex === rootIndex;
            return (
              <div
                key={rootEntry.path}
                draggable
                onDragStart={() => setRootDragIndex(rootIndex)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (rootDragIndex !== null && rootDragIndex !== rootIndex) {
                    reorderProjectRoots(rootDragIndex, rootIndex);
                    setRootDragIndex(rootIndex);
                  }
                }}
                onDragEnd={() => setRootDragIndex(null)}
                className={`group ${isDragging ? 'opacity-50' : ''}`}
              >
                <RootHeader entry={rootEntry} theme={theme} />
                {expandedDirs.has(rootEntry.path) && rootEntry.children && (
                  <div>
                    {rootEntry.children
                      .sort((a, b) => {
                        if (a.isDir && !b.isDir) return -1;
                        if (!a.isDir && b.isDir) return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map(child => (
                        <TreeNode key={child.path} entry={child} depth={1} />
                      ))}
                  </div>
                )}
              </div>
            );
          })
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
              <TreeNode key={entry.path} entry={entry} />
            ))
        )}
      </div>
    </div>
  );
}
