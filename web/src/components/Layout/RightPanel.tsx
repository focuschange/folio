import { useAppStore } from '../../store/useAppStore';
import { OutlinePanel } from './OutlinePanel';
import { FilesPanel } from './FilesPanel';
import { GitPanel } from '../Git/GitPanel';
import { FileInfoPanel } from './FileInfoPanel';
import { TodoPanel } from './TodoPanel';
import { TocPanel } from './TocPanel';
import { LinksPanel } from './LinksPanel';
import { RecentFilesPanel } from './RecentFilesPanel';
import { BookmarksPanel } from './BookmarksPanel';
import {
  FileCode2, Files, GitBranch, Info,
  Bug, Hash, Link2, History, Bookmark,
} from 'lucide-react';
import type { RightTab } from '../../types';

const tabItems: { id: RightTab; icon: typeof FileCode2; label: string }[] = [
  { id: 'outline', icon: FileCode2, label: 'Outline' },
  { id: 'files', icon: Files, label: 'Files' },
  { id: 'git', icon: GitBranch, label: 'Git' },
  { id: 'info', icon: Info, label: 'Info' },
  { id: 'todos', icon: Bug, label: 'TODOs' },
  { id: 'toc', icon: Hash, label: 'TOC' },
  { id: 'links', icon: Link2, label: 'Links' },
  { id: 'recent', icon: History, label: 'Recent' },
  { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks' },
];

export function RightPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const activeRightTab = useAppStore(s => s.activeRightTab);
  const setActiveRightTab = useAppStore(s => s.setActiveRightTab);

  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const activeTabBg = theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const textActive = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';

  return (
    <div className={`h-full flex flex-col ${bg} border-l ${border} overflow-hidden`}>
      {/* Tab bar — scrollable, icon-only (tooltip on hover) to fit 8 tabs */}
      <div
        className={`flex items-center gap-0.5 px-1 py-1 border-b ${border} shrink-0 overflow-x-auto`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {tabItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeRightTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveRightTab(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors shrink-0 ${
                isActive ? `${activeTabBg} ${textActive}` : `${textMuted} ${hoverBg}`
              }`}
              title={label}
            >
              <Icon size={12} />
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeRightTab === 'outline' && <OutlinePanel />}
        {activeRightTab === 'files' && <FilesPanel />}
        {activeRightTab === 'git' && <GitPanel />}
        {activeRightTab === 'info' && <FileInfoPanel />}
        {activeRightTab === 'todos' && <TodoPanel />}
        {activeRightTab === 'toc' && <TocPanel />}
        {activeRightTab === 'links' && <LinksPanel />}
        {activeRightTab === 'recent' && <RecentFilesPanel />}
        {activeRightTab === 'bookmarks' && <BookmarksPanel />}
      </div>
    </div>
  );
}
