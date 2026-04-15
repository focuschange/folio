import { useAppStore } from '../../store/useAppStore';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { FileTree } from '../FileTree/FileTree';
import { EditorArea } from '../Editor/EditorArea';
import { RightPanel } from './RightPanel';
import { TerminalPane } from '../Terminal/TerminalPane';
import { SettingsDialog } from '../Settings/SettingsDialog';
import { ProjectSearchPanel } from '../Search/ProjectSearch';
import { useRef, useCallback, useEffect } from 'react';
import { Minimize2 } from 'lucide-react';

function Resizer({ direction = 'horizontal', onDrag }: {
  direction?: 'horizontal' | 'vertical';
  onDrag: (startValue: number, delta: number) => void;
}) {
  const theme = useAppStore(s => s.settings.theme);
  const isH = direction === 'horizontal';
  const startPosRef = useRef(0);
  const startValueRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startPosRef.current = isH ? e.clientX : e.clientY;
    // Store current size at drag start via a callback
    startValueRef.current = 0; // will be set by parent

    const handleMove = (me: MouseEvent) => {
      const currentPos = isH ? me.clientX : me.clientY;
      const delta = currentPos - startPosRef.current;
      onDrag(startPosRef.current, delta);
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = isH ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [isH, onDrag]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`flex-shrink-0 ${isH ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'} ${
        theme === 'dark' ? 'bg-zinc-800 hover:bg-blue-500/40' : 'bg-zinc-200 hover:bg-blue-500/30'
      } transition-colors`}
    />
  );
}

export function MainLayout() {
  const theme = useAppStore(s => s.settings.theme);
  const sidebarVisible = useAppStore(s => s.sidebarVisible);
  const rightPanelVisible = useAppStore(s => s.rightPanelVisible);
  const terminalVisible = useAppStore(s => s.terminalVisible);
  const searchVisible = useAppStore(s => s.searchVisible);
  const settingsVisible = useAppStore(s => s.settingsVisible);
  const zenMode = useAppStore(s => s.zenMode);

  const sidebarWidth = useAppStore(s => s.sidebarWidth);
  const rightWidth = useAppStore(s => s.rightWidth);
  const terminalHeight = useAppStore(s => s.terminalHeight);
  const setSidebarWidth = useAppStore(s => s.setSidebarWidth);
  const setRightWidth = useAppStore(s => s.setRightWidth);
  const setTerminalHeight = useAppStore(s => s.setTerminalHeight);

  // Use refs for drag state to avoid stale closures
  const sidebarWidthRef = useRef(sidebarWidth);
  const rightWidthRef = useRef(rightWidth);
  const terminalHeightRef = useRef(terminalHeight);

  const handleSidebarDrag = useCallback((_startPos: number, delta: number) => {
    // On first move, capture the width at drag start
    if (Math.abs(delta) < 2) {
      sidebarWidthRef.current = sidebarWidth;
    }
    const newWidth = Math.max(140, Math.min(600, sidebarWidthRef.current + delta));
    setSidebarWidth(newWidth);
  }, [sidebarWidth]);

  const handleRightDrag = useCallback((_startPos: number, delta: number) => {
    if (Math.abs(delta) < 2) {
      rightWidthRef.current = rightWidth;
    }
    const newWidth = Math.max(140, Math.min(500, rightWidthRef.current - delta));
    setRightWidth(newWidth);
  }, [rightWidth]);

  const handleTerminalDrag = useCallback((_startPos: number, delta: number) => {
    if (Math.abs(delta) < 2) {
      terminalHeightRef.current = terminalHeight;
    }
    const newHeight = Math.max(80, Math.min(600, terminalHeightRef.current - delta));
    setTerminalHeight(newHeight);
  }, [terminalHeight]);

  const textColor = theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900';
  const bgColor = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const toggleZenMode = useAppStore(s => s.toggleZenMode);

  // Exit Zen mode handler — also exits native fullscreen
  const exitZenMode = useCallback(async () => {
    toggleZenMode();
    if ('__TAURI_INTERNALS__' in window) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().setFullscreen(false);
      } catch (e) { console.error(e); }
    }
  }, [toggleZenMode]);

  // ESC and F11 to exit Zen mode
  useEffect(() => {
    if (!zenMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F11') {
        e.preventDefault();
        exitZenMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zenMode, exitZenMode]);

  return (
    <div className={`h-screen flex flex-col ${bgColor} ${textColor} overflow-hidden`}>
      {!zenMode && <Toolbar />}

      {/* Exit Zen Mode button in title bar (right side) */}
      {zenMode && (
        <button
          onClick={exitZenMode}
          className={`fixed top-0 right-2 z-50 h-7 flex items-center gap-1.5 px-2.5 rounded text-xs transition-colors ${
            theme === 'dark'
              ? 'text-zinc-300 hover:bg-zinc-700/80 hover:text-white'
              : 'text-zinc-700 hover:bg-zinc-200/80 hover:text-black'
          }`}
          title="Exit Zen Mode (ESC or F11)"
        >
          <Minimize2 size={12} />
          <span>Exit Zen Mode</span>
        </button>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Left: File Tree / Search */}
        {sidebarVisible && !zenMode && (
          <>
            <div style={{ width: sidebarWidth, minWidth: 140 }} className="flex-shrink-0 overflow-hidden">
              {searchVisible ? <ProjectSearchPanel /> : <FileTree />}
            </div>
            <Resizer onDrag={handleSidebarDrag} />
          </>
        )}

        {/* Center: Editor + Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <EditorArea />
          </div>
          {terminalVisible && !zenMode && (
            <>
              <Resizer direction="vertical" onDrag={handleTerminalDrag} />
              <div style={{ height: terminalHeight }} className="flex-shrink-0 overflow-hidden">
                <TerminalPane />
              </div>
            </>
          )}
        </div>

        {/* Right: Tabbed Panel */}
        {rightPanelVisible && !zenMode && (
          <>
            <Resizer onDrag={handleRightDrag} />
            <div style={{ width: rightWidth, minWidth: 140 }} className="flex-shrink-0 overflow-hidden">
              <RightPanel />
            </div>
          </>
        )}
      </div>

      {!zenMode && <StatusBar />}
      {settingsVisible && <SettingsDialog />}
    </div>
  );
}
