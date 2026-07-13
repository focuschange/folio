import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FileIcon } from '../../utils/fileIcons';
import { X, Pin, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { COMMON_ENCODINGS } from '../../utils/encodings';
import { ALL_LANGUAGES } from '../../utils/languages';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { encodeDragId } from '../../hooks/useGlobalDnD';
import type { EditorTab } from '../../types';

type SubMenuKind = 'encoding' | 'language' | null;

export function EditorTabs() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const closeTab = useAppStore(s => s.requestCloseTab);
  const pinTab = useAppStore(s => s.pinTab);
  const unpinTab = useAppStore(s => s.unpinTab);
  const requestCloseTabs = useAppStore(s => s.requestCloseTabs);
  const setTabEncoding = useAppStore(s => s.setTabEncoding);
  const setTabLanguage = useAppStore(s => s.setTabLanguage);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [subMenu, setSubMenu] = useState<{ kind: SubMenuKind; x: number; y: number }>({ kind: null, x: 0, y: 0 });
  const [hoverTooltip, setHoverTooltip] = useState<{ tabId: string; x: number } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Whenever the active tab changes (e.g. tree double-click selects an already-open file),
  // make sure the corresponding tab header is scrolled into view in the horizontal tab bar.
  useEffect(() => {
    if (!activeTabId) return;
    const container = tabsRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
    if (!el) return;
    // `inline: 'nearest'` only scrolls horizontally if the tab is off-screen, avoiding jitter.
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTabId, tabs.length]);

  const closeAllMenus = () => {
    setContextMenu(null);
    setSubMenu({ kind: null, x: 0, y: 0 });
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
    setSubMenu({ kind: null, x: 0, y: 0 });
  };

  if (tabs.length === 0) return null;

  const activeBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-white';
  const inactiveBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-100';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50';
  const menuBg = theme === 'dark' ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-zinc-200';
  const menuItemHover = theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100';
  const itemClass = `flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer ${menuItemHover}`;

  const tab = contextMenu ? tabs.find(t => t.id === contextMenu.tabId) : null;

  const parentMenuRef = useRef<HTMLDivElement>(null);

  // Compute submenu position to attach to the right edge of the parent CONTEXT MENU
  // (not the menu item), so it never overlaps other items in the parent menu.
  const getSubmenuPos = (anchorY: number, width = 220) => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const SUBMENU_HEIGHT = 400;
    const parentRect = parentMenuRef.current?.getBoundingClientRect();
    let x = parentRect ? parentRect.right : (contextMenu?.x ?? 0) + 200;
    if (x + width > screenW) {
      // Not enough space on right — flip to the left of the parent menu
      x = parentRect ? parentRect.left - width : Math.max(0, x - width - 200);
      if (x < 0) x = 0;
    }
    let y = anchorY;
    if (y + SUBMENU_HEIGHT > screenH) y = Math.max(0, screenH - SUBMENU_HEIGHT - 8);
    return { x, y };
  };

  return (
    <div className="relative">
      <div
        ref={tabsRef}
        className={`folio-autohide-scrollbar flex items-end overflow-x-auto border-b ${border} select-none shrink-0`}
        style={{ scrollbarWidth: 'thin' }}
      >
        <SortableContext
          items={tabs.map(t => encodeDragId({ kind: 'tab', tabId: t.id }))}
          strategy={horizontalListSortingStrategy}
        >
          {tabs.map((tab, index) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              index={index}
              isActive={tab.id === activeTabId}
              theme={theme}
              activeBg={activeBg}
              inactiveBg={inactiveBg}
              hoverBg={hoverBg}
              border={border}
              onActivate={() => setActiveTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              onShowTooltip={(x) => setHoverTooltip({ tabId: tab.id, x })}
              onHideTooltip={() => setHoverTooltip(null)}
              onClose={() => closeTab(tab.id)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Tooltip */}
      {hoverTooltip && (() => {
        const t = tabs.find(t => t.id === hoverTooltip.tabId);
        if (!t) return null;
        return (
          <div
            className={`fixed z-50 px-2 py-1 text-xs rounded shadow-lg ${
              theme === 'dark' ? 'bg-zinc-800 text-zinc-200 border border-zinc-600' : 'bg-white text-zinc-800 border border-zinc-300'
            }`}
            style={{ left: hoverTooltip.x, top: (tabsRef.current?.getBoundingClientRect().bottom ?? 0) + 4 }}
          >
            {t.missing && (
              <div className="text-amber-500 font-semibold mb-0.5">⚠ 파일이 사라졌습니다</div>
            )}
            {t.path}
          </div>
        );
      })()}

      {/* Context Menu */}
      {contextMenu && tab && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeAllMenus} />
          <div
            ref={parentMenuRef}
            className={`fixed z-50 py-1 rounded-md shadow-lg min-w-[180px] border ${menuBg}`}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className={itemClass} onClick={() => {
              tab.pinned ? unpinTab(tab.id) : pinTab(tab.id);
              closeAllMenus();
            }}>
              {tab.pinned ? 'Unpin Tab' : 'Pin Tab'}
            </div>
            <div className={itemClass} onClick={() => {
              const others = tabs.filter(t => t.id !== contextMenu.tabId && !t.pinned).map(t => t.id);
              setActiveTab(contextMenu.tabId);
              requestCloseTabs(others);
              closeAllMenus();
            }}>
              Close Other Tabs
            </div>
            {!tab.pinned && (
              <div className={itemClass} onClick={() => { closeTab(contextMenu.tabId); closeAllMenus(); }}>
                Close Tab
              </div>
            )}

            <div className={`my-1 border-t ${border}`} />

            {/* Change Encoding ▶ */}
            <div
              className={itemClass}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const pos = getSubmenuPos(rect.top);
                setSubMenu({ kind: 'encoding', x: pos.x, y: pos.y });
              }}
            >
              <span>Encoding: <span className="opacity-70">{tab.encoding}</span></span>
              <ChevronRight size={12} />
            </div>

            {/* Change Language ▶ */}
            <div
              className={itemClass}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const pos = getSubmenuPos(rect.top);
                setSubMenu({ kind: 'language', x: pos.x, y: pos.y });
              }}
            >
              <span>Language: <span className="opacity-70">{tab.language}</span></span>
              <ChevronRight size={12} />
            </div>
          </div>

          {/* Submenu: Encoding */}
          {subMenu.kind === 'encoding' && (
            <div
              className={`fixed z-50 py-1 rounded-md shadow-lg border max-h-[400px] overflow-y-auto ${menuBg}`}
              style={{ left: subMenu.x, top: subMenu.y, minWidth: 220 }}
            >
              {COMMON_ENCODINGS.map(enc => {
                const checked = tab.encoding === enc.value;
                return (
                  <div
                    key={enc.value}
                    className={itemClass}
                    onClick={() => {
                      setTabEncoding(tab.id, enc.value);
                      closeAllMenus();
                    }}
                  >
                    <span>{enc.label}</span>
                    {checked && <Check size={12} className="text-blue-400" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Submenu: Language */}
          {subMenu.kind === 'language' && (
            <div
              className={`fixed z-50 py-1 rounded-md shadow-lg border max-h-[400px] overflow-y-auto ${menuBg}`}
              style={{ left: subMenu.x, top: subMenu.y, minWidth: 200 }}
            >
              {ALL_LANGUAGES.map(lang => {
                const checked = tab.language === lang.value;
                return (
                  <div
                    key={lang.value}
                    className={itemClass}
                    onClick={() => {
                      setTabLanguage(tab.id, lang.value);
                      closeAllMenus();
                    }}
                  >
                    <span>{lang.label}</span>
                    {checked && <Check size={12} className="text-blue-400" />}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Single tab cell wired up with @dnd-kit/sortable.
// - Drag handle = entire row (whole row activates drag once pointer moves >4px).
// - We register an INVISIBLE droppable slot on the LEFT edge so dropping right
//   before this tab inserts at this tab's index. The last tab's right-edge slot
//   is rendered separately in the parent (after the loop) — covered by `tab-slot:tabs.length`.
function SortableTab({
  tab, index, isActive, theme, activeBg, inactiveBg, hoverBg, border,
  onActivate, onContextMenu, onShowTooltip, onHideTooltip, onClose,
}: {
  tab: EditorTab;
  index: number;
  isActive: boolean;
  theme: string;
  activeBg: string;
  inactiveBg: string;
  hoverBg: string;
  border: string;
  onActivate: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onShowTooltip: (x: number) => void;
  onHideTooltip: () => void;
  onClose: () => void;
}) {
  const dragId = encodeDragId({ kind: 'tab', tabId: tab.id });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dragId,
    // The sortable slot ID we register on the wrapper acts as both drag id and drop slot id;
    // @dnd-kit/sortable uses the same id for both, and the SortableContext maps cross-item
    // hovers to reorder events that bubble up through our DragEndEvent.
    data: { kind: 'tab', index },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    minWidth: 'fit-content',
    maxWidth: '180px',
  };

  return (
    <div
      ref={setNodeRef}
      data-tab-id={tab.id}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      onMouseEnter={(e) => onShowTooltip(e.clientX)}
      onMouseLeave={onHideTooltip}
      className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r ${border} transition-colors ${
        isActive
          ? `${activeBg} border-t-2 border-t-blue-500`
          : `${inactiveBg} ${hoverBg} border-t-2 border-t-transparent`
      }`}
    >
      {tab.pinned && <Pin size={12} className="text-blue-400 shrink-0" />}
      {tab.missing
        ? <AlertTriangle size={14} className="text-amber-500 shrink-0" />
        : <FileIcon name={tab.name} size={14} />}
      <span className={`truncate ${tab.missing ? 'line-through text-amber-500' : ''}`}>
        {tab.dirty && <span className="text-blue-400">* </span>}
        {tab.name}
      </span>
      {!tab.pinned && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
            theme === 'dark' ? 'hover:bg-zinc-600' : 'hover:bg-zinc-300'
          }`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

