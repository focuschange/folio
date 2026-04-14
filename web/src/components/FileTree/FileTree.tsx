import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { FileIcon, FolderIcon } from '../../utils/fileIcons';
import { ChevronRight, ChevronDown, Filter } from 'lucide-react';
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

  const handleClick = () => {
    setSelectedPath(entry.path);
    if (entry.isDir) {
      toggleDir(entry.path);
    } else {
      openFileInEditor(entry.path, entry.name);
    }
  };

  const handleDoubleClick = () => {
    if (!entry.isDir) {
      openFileInEditor(entry.path, entry.name);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 pr-2 cursor-pointer text-sm select-none ${hoverBg} ${selectedBg} ${gitColor} transition-colors`}
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

export function FileTree() {
  const theme = useAppStore(s => s.settings.theme);
  const fileTree = useAppStore(s => s.fileTree);
  const projectRoot = useAppStore(s => s.projectRoot);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className={`h-full flex flex-col overflow-hidden ${
      theme === 'dark' ? 'bg-zinc-900' : 'bg-white'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ${textMuted}`}>
        <span className="truncate">{rootName}</span>
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
        ) : (
          filteredTree
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
