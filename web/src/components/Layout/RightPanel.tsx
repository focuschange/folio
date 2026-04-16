import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { ImageGalleryPanel } from './ImageGalleryPanel';
import {
  FileCode2, Files, GitBranch, Info,
  Bug, Hash, Link2, History, Bookmark,
  Image as ImageIcon,
  ChevronLeft, ChevronRight, MoreHorizontal,
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
  { id: 'images', icon: ImageIcon, label: 'Images' },
];

export function RightPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const activeRightTab = useAppStore(s => s.activeRightTab);
  const setActiveRightTab = useAppStore(s => s.setActiveRightTab);
  const resizeRightPanel = useAppStore(s => s.resizeRightPanel);

  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const activeTabBg = theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const textActive = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';

  // --- Responsive tab overflow ---
  // When the panel is too narrow to fit all tab icons, hide the rightmost ones behind a "more" dropdown.
  // The currently active tab is always kept inline (even if it would otherwise overflow).
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const moreRef = useRef<HTMLDivElement>(null);
  const rightControlsRef = useRef<HTMLDivElement>(null);
  const widthsRef = useRef<number[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(tabItems.length);
  const [moreOpen, setMoreOpen] = useState(false);

  // Measure natural widths of each tab once items render (they always render; we hide via display:none)
  useLayoutEffect(() => {
    widthsRef.current = tabRefs.current
      .slice(0, tabItems.length)
      .map(el => (el ? el.getBoundingClientRect().width : 0));
  }, []);

  useLayoutEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const recompute = () => {
      const widths = widthsRef.current;
      if (widths.length === 0) return;
      const GAP = 2;
      const reserved = (rightControlsRef.current?.getBoundingClientRect().width ?? 0) + 4;
      const available = container.clientWidth - reserved;

      const totalAll = widths.reduce((a, b) => a + b + GAP, 0);
      if (totalAll <= available) {
        setVisibleCount(tabItems.length);
        return;
      }

      const moreW = (moreRef.current?.getBoundingClientRect().width || 28) + GAP;
      let used = moreW;
      let count = 0;
      for (const w of widths) {
        if (used + w + GAP > available) break;
        used += w + GAP;
        count++;
      }
      setVisibleCount(Math.max(0, count));
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Ensure the active tab is always inline — if it would be overflowed, swap it with the last visible tab
  const { orderedTabs, visibleTabs, hiddenTabs } = useMemo(() => {
    const ordered = [...tabItems];
    if (visibleCount < tabItems.length) {
      const activeIndex = ordered.findIndex(t => t.id === activeRightTab);
      if (activeIndex >= visibleCount) {
        // Move the active tab to the last visible slot
        const [active] = ordered.splice(activeIndex, 1);
        ordered.splice(visibleCount - 1, 0, active);
      }
    }
    return {
      orderedTabs: ordered,
      visibleTabs: ordered.slice(0, visibleCount),
      hiddenTabs: ordered.slice(visibleCount),
    };
  }, [visibleCount, activeRightTab]);
  void visibleTabs;

  // Close the "more" popup when clicking outside
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      const more = moreRef.current;
      if (more && !more.contains(e.target as Node)) setMoreOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  return (
    <div className={`h-full flex flex-col ${bg} border-l ${border} overflow-hidden`}>
      {/* Tab bar — responsive overflow + resize controls on the right */}
      <div
        ref={tabsContainerRef}
        className={`flex items-center gap-0.5 px-1 py-1 border-b ${border} shrink-0`}
      >
        {/* Render all tabs but hide those beyond visibleCount */}
        {orderedTabs.map(({ id, icon: Icon, label }, i) => {
          const isActive = activeRightTab === id;
          const hidden = i >= visibleCount;
          return (
            <button
              key={id}
              ref={el => { tabRefs.current[i] = el; }}
              onClick={() => setActiveRightTab(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors shrink-0 ${
                isActive ? `${activeTabBg} ${textActive}` : `${textMuted} ${hoverBg}`
              }`}
              title={label}
              style={hidden ? { display: 'none' } : undefined}
            >
              <Icon size={12} />
            </button>
          );
        })}

        {/* More (…) dropdown for overflowed tabs */}
        <div
          ref={moreRef}
          className="relative"
          style={hiddenTabs.length === 0 ? { display: 'none' } : undefined}
        >
          <button
            onClick={() => setMoreOpen(o => !o)}
            className={`flex items-center px-2 py-1 rounded text-[11px] transition-colors shrink-0 ${
              moreOpen ? `${activeTabBg} ${textActive}` : `${textMuted} ${hoverBg}`
            }`}
            title="More tabs"
          >
            <MoreHorizontal size={12} />
          </button>
          {moreOpen && (
            <div
              className={`absolute right-0 top-full mt-0.5 min-w-[140px] rounded border shadow-lg z-20 py-1 ${
                theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
              }`}
            >
              {hiddenTabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveRightTab(id);
                    setMoreOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left ${hoverBg}`}
                >
                  <Icon size={12} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer pushes resize controls to the right edge */}
        <div className="flex-1" />

        {/* Resize buttons (always visible, reserved space) */}
        <div ref={rightControlsRef} className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => resizeRightPanel(80)}
            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            title="Widen Panel (⌘⌥⇧←)"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            onClick={() => resizeRightPanel(-80)}
            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            title="Narrow Panel (⌘⌥⇧→)"
          >
            <ChevronRight size={12} />
          </button>
        </div>
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
        {activeRightTab === 'images' && <ImageGalleryPanel />}
      </div>
    </div>
  );
}
