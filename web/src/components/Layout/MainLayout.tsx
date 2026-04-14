import { useAppStore } from '../../store/useAppStore';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { Sidebar } from './Sidebar';
import { FileTree } from '../FileTree/FileTree';
import { EditorArea } from '../Editor/EditorArea';
import { GitPanel } from '../Git/GitPanel';
import { TerminalPane } from '../Terminal/TerminalPane';
import { SettingsDialog } from '../Settings/SettingsDialog';
import { ProjectSearchPanel } from '../Search/ProjectSearch';
import { useRef, useCallback, useState } from 'react';

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
  const gitPanelVisible = useAppStore(s => s.gitPanelVisible);
  const terminalVisible = useAppStore(s => s.terminalVisible);
  const searchVisible = useAppStore(s => s.searchVisible);
  const settingsVisible = useAppStore(s => s.settingsVisible);
  const zenMode = useAppStore(s => s.zenMode);

  // Use refs for drag state to avoid stale closures
  const sidebarWidthRef = useRef(260);
  const rightWidthRef = useRef(200);
  const terminalHeightRef = useRef(200);

  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(200);
  const [terminalHeight, setTerminalHeight] = useState(200);

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

  return (
    <div className={`h-screen flex flex-col ${bgColor} ${textColor} overflow-hidden`}>
      {!zenMode && <Toolbar />}

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

        {/* Right: Sidebar / Git */}
        {(rightPanelVisible || gitPanelVisible) && !zenMode && (
          <>
            <Resizer onDrag={handleRightDrag} />
            <div style={{ width: rightWidth, minWidth: 140 }} className="flex-shrink-0 overflow-hidden">
              {gitPanelVisible ? <GitPanel /> : <Sidebar />}
            </div>
          </>
        )}
      </div>

      {!zenMode && <StatusBar />}
      {settingsVisible && <SettingsDialog />}
    </div>
  );
}
