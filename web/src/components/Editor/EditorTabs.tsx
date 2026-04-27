import { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FileIcon } from '../../utils/fileIcons';
import { X, Pin, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { setCurrentDrag, clearCurrentDrag } from '../../utils/dragState';
import { COMMON_ENCODINGS } from '../../utils/encodings';
import { ALL_LANGUAGES } from '../../utils/languages';

type SubMenuKind = 'encoding' | 'language' | null;

export function EditorTabs() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const closeTab = useAppStore(s => s.closeTab);
  const pinTab = useAppStore(s => s.pinTab);
  const unpinTab = useAppStore(s => s.unpinTab);
  const closeOtherTabs = useAppStore(s => s.closeOtherTabs);
  const reorderTabs = useAppStore(s => s.reorderTabs);
  const setTabEncoding = useAppStore(s => s.setTabEncoding);
  const setTabLanguage = useAppStore(s => s.setTabLanguage);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [subMenu, setSubMenu] = useState<{ kind: SubMenuKind; x: number; y: number }>({ kind: null, x: 0, y: 0 });
  const [hoverTooltip, setHoverTooltip] = useState<{ tabId: string; x: number } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const closeAllMenus = () => {
    setContextMenu(null);
    setSubMenu({ kind: null, x: 0, y: 0 });
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
    setSubMenu({ kind: null, x: 0, y: 0 });
  };

  const handleDragStart = (e: React.DragEvent, index: number, tabId: string, tabName: string) => {
    setDragIndex(index);
    // Track the tab via a module-level singleton so external drop targets (FileTree) can read it
    // even when the webview hides custom MIME types during `dragover`.
    setCurrentDrag({ kind: 'tab', tabId });
    // Setting plain-text data ensures the native drag actually initiates in webviews that
    // require some setData call (no effectAllowed — that conflicts with default copy in some webviews).
    try {
      e.dataTransfer.setData('text/plain', tabName);
    } catch {
      // dataTransfer may be locked in some browsers — fall back silently
    }
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      reorderTabs(dragIndex, index);
      setDragIndex(index);
    }
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    clearCurrentDrag();
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
        className={`flex items-end overflow-x-auto border-b ${border} select-none shrink-0`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index, tab.id, tab.name)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              onMouseEnter={(e) => setHoverTooltip({ tabId: tab.id, x: e.clientX })}
              onMouseLeave={() => setHoverTooltip(null)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r ${border} transition-colors ${
                isActive
                  ? `${activeBg} border-t-2 border-t-blue-500`
                  : `${inactiveBg} ${hoverBg} border-t-2 border-t-transparent`
              }`}
              style={{ minWidth: 'fit-content', maxWidth: '180px' }}
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
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className={`ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                    theme === 'dark' ? 'hover:bg-zinc-600' : 'hover:bg-zinc-300'
                  }`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
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
            <div className={itemClass} onClick={() => { closeOtherTabs(contextMenu.tabId); closeAllMenus(); }}>
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
