import { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FileIcon } from '../../utils/fileIcons';
import { X, Pin } from 'lucide-react';

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

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ tabId: string; x: number } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
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
  };

  if (tabs.length === 0) return null;

  const activeBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-white';
  const inactiveBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-100';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50';

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
              onDragStart={() => handleDragStart(index)}
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
              <FileIcon name={tab.name} size={14} />
              <span className="truncate">
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
        const tab = tabs.find(t => t.id === hoverTooltip.tabId);
        if (!tab) return null;
        return (
          <div
            className={`fixed z-50 px-2 py-1 text-xs rounded shadow-lg ${
              theme === 'dark' ? 'bg-zinc-800 text-zinc-200 border border-zinc-600' : 'bg-white text-zinc-800 border border-zinc-300'
            }`}
            style={{ left: hoverTooltip.x, top: (tabsRef.current?.getBoundingClientRect().bottom ?? 0) + 4 }}
          >
            {tab.path}
          </div>
        );
      })()}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className={`fixed z-50 py-1 rounded-md shadow-lg min-w-[160px] ${
              theme === 'dark' ? 'bg-zinc-800 border border-zinc-600' : 'bg-white border border-zinc-200'
            }`}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {(() => {
              const tab = tabs.find(t => t.id === contextMenu.tabId);
              if (!tab) return null;
              const itemClass = `px-3 py-1.5 text-xs cursor-pointer ${theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`;
              return (
                <>
                  <div className={itemClass} onClick={() => { tab.pinned ? unpinTab(tab.id) : pinTab(tab.id); setContextMenu(null); }}>
                    {tab.pinned ? 'Unpin Tab' : 'Pin Tab'}
                  </div>
                  <div className={itemClass} onClick={() => { closeOtherTabs(contextMenu.tabId); setContextMenu(null); }}>
                    Close Other Tabs
                  </div>
                  {!tab.pinned && (
                    <div className={itemClass} onClick={() => { closeTab(contextMenu.tabId); setContextMenu(null); }}>
                      Close Tab
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
