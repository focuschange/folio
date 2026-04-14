import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Terminal, X, Maximize2, Minimize2 } from 'lucide-react';

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export function TerminalPane() {
  const theme = useAppStore(s => s.settings.theme);
  const toggleTerminal = useAppStore(s => s.toggleTerminal);
  const projectRoot = useAppStore(s => s.projectRoot);

  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'output', text: `Folio Terminal - ${isTauri ? 'Tauri' : 'Web'} Mode` },
    { type: 'output', text: `Working directory: ${projectRoot || '/project'}` },
    { type: 'output', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [maximized, setMaximized] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const executeCommand = useCallback(async (cmd: string) => {
    setLines(prev => [...prev, { type: 'input', text: `$ ${cmd}` }]);

    if (isTauri) {
      try {
        const result = await tauriInvoke<{ stdout: string; stderr: string; exitCode: number }>('run_command', {
          command: cmd, cwd: projectRoot,
        });
        if (result.stdout) {
          setLines(prev => [...prev, { type: 'output', text: result.stdout }]);
        }
        if (result.stderr) {
          setLines(prev => [...prev, { type: 'error', text: result.stderr }]);
        }
      } catch (e) {
        setLines(prev => [...prev, { type: 'error', text: String(e) }]);
      }
    } else {
      // Mock terminal
      const mockResponses: Record<string, string> = {
        'ls': 'src/  docs/  package.json  tsconfig.json  vite.config.ts  .gitignore  README.md',
        'pwd': projectRoot || '/project',
        'whoami': 'developer',
        'date': new Date().toLocaleString(),
        'echo': cmd.replace('echo ', ''),
        'node -v': 'v22.0.0',
        'npm -v': '10.0.0',
        'help': 'Available mock commands: ls, pwd, whoami, date, echo, node -v, npm -v, clear, help',
      };

      if (cmd === 'clear') {
        setLines([]);
        return;
      }

      const response = mockResponses[cmd] || mockResponses[cmd.split(' ')[0]] || `command not found: ${cmd.split(' ')[0]}`;
      setLines(prev => [...prev, { type: 'output', text: response }]);
    }
  }, [projectRoot]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      executeCommand(input.trim());
      setHistory(prev => [input.trim(), ...prev]);
      setHistoryIndex(-1);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-50';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className={`h-full flex flex-col ${bg} border-t ${border}`}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-1 border-b ${border} shrink-0`}>
        <div className="flex items-center gap-1.5">
          <Terminal size={12} className="text-blue-400" />
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${textMuted}`}>Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMaximized(!maximized)} className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}>
            {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button onClick={toggleTerminal} className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs leading-relaxed"
      >
        {lines.map((line, i) => (
          <div key={i} className={
            line.type === 'input' ? 'text-blue-400' :
            line.type === 'error' ? 'text-red-400' :
            theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
          }>
            {line.text.split('\n').map((l, j) => (
              <div key={j}>{l || '\u00A0'}</div>
            ))}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className={`flex items-center gap-2 px-2 py-1.5 border-t ${border} shrink-0`}>
        <span className="text-blue-400 text-xs font-mono">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 bg-transparent outline-none text-xs font-mono ${
            theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'
          }`}
          placeholder="Enter command..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
