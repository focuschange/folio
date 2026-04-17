import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Globe, Play, Square, RefreshCw, ExternalLink, Hammer } from 'lucide-react';
import type { CommandOutput } from '../../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export function JekyllPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const projectRoots = useAppStore(s => s.projectRoots);
  const [detected, setDetected] = useState(false);
  const [serving, setServing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serveUrl, setServeUrl] = useState('http://localhost:4000');

  const root = projectRoots[0] ?? '';

  const detectJekyll = useCallback(async () => {
    if (!isTauri || !root) return;
    try {
      await tauriInvoke<string>('read_file', { path: `${root}/_config.yml` });
      setDetected(true);
    } catch {
      try {
        await tauriInvoke<string>('read_file', { path: `${root}/Gemfile` });
        setDetected(true);
      } catch {
        setDetected(false);
      }
    }
  }, [root]);

  useEffect(() => { detectJekyll(); }, [detectJekyll]);

  const serve = async () => {
    if (!isTauri || serving) return;
    setServing(true);
    setError(null);
    setOutput('Starting Jekyll serve...\n');
    try {
      const result = await tauriInvoke<CommandOutput>('run_command', {
        command: 'bundle exec jekyll serve --detach 2>&1 || jekyll serve --detach 2>&1',
        cwd: root,
      });
      setOutput(prev => prev + result.stdout + result.stderr);
      if (result.exitCode !== 0) {
        setError('Serve failed — see output');
        setServing(false);
      }
    } catch (e) {
      setError(String(e));
      setServing(false);
    }
  };

  const stopServe = async () => {
    if (!isTauri) return;
    try {
      await tauriInvoke<CommandOutput>('run_command', {
        command: "pkill -f 'jekyll serve' || true",
        cwd: root,
      });
    } catch { /* ignore */ }
    setServing(false);
    setOutput(prev => prev + '\nJekyll serve stopped.\n');
  };

  const build = async () => {
    if (!isTauri || building) return;
    setBuilding(true);
    setError(null);
    setOutput('Building Jekyll site...\n');
    try {
      const result = await tauriInvoke<CommandOutput>('run_command', {
        command: 'bundle exec jekyll build 2>&1 || jekyll build 2>&1',
        cwd: root,
      });
      setOutput(prev => prev + result.stdout + result.stderr);
      if (result.exitCode !== 0) {
        setError('Build failed — see output');
      }
    } catch (e) {
      setError(String(e));
    }
    setBuilding(false);
  };

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const btnBg = theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-200 hover:bg-zinc-300';

  if (!detected) {
    return (
      <div className={`h-full flex flex-col items-center justify-center ${bg}`}>
        <Globe size={32} className={`${textMuted} mb-3 opacity-30`} />
        <p className={`text-xs ${textMuted} text-center px-4`}>
          No Jekyll site detected.
        </p>
        <p className={`text-[10px] ${textMuted} mt-1 text-center px-4`}>
          Open a folder containing _config.yml or Gemfile.
        </p>
        <button onClick={detectJekyll} className={`mt-3 flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg}`}>
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${bg} overflow-hidden`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${border}`}>
        <Globe size={14} className="text-red-400" />
        <span className="text-xs font-medium flex-1">Jekyll</span>
        <button onClick={detectJekyll} className={`p-0.5 rounded ${textMuted} hover:text-red-400`}>
          <RefreshCw size={12} />
        </button>
      </div>

      {error && (
        <div className="px-3 py-1.5 text-[11px] bg-red-900/30 text-red-400">{error}</div>
      )}

      {/* Action buttons */}
      <div className={`flex items-center gap-1 px-3 py-2 border-b ${border}`}>
        {serving ? (
          <button onClick={stopServe} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg} text-red-400`}>
            <Square size={12} /> Stop
          </button>
        ) : (
          <button onClick={serve} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg}`}>
            <Play size={12} /> Serve
          </button>
        )}
        <button onClick={build} disabled={building}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg} disabled:opacity-40`}>
          <Hammer size={12} /> {building ? 'Building...' : 'Build'}
        </button>
        {serving && (
          <a
            href={serveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg} text-blue-400`}
          >
            <ExternalLink size={12} /> Preview
          </a>
        )}
      </div>

      {/* URL input */}
      <div className={`px-3 py-1.5 border-b ${border}`}>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] ${textMuted}`}>URL:</span>
          <input
            value={serveUrl}
            onChange={e => setServeUrl(e.target.value)}
            className={`flex-1 px-1 py-0.5 rounded text-xs ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'} outline-none`}
          />
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${textMuted} border-b ${border}`}>
          Output
        </div>
        <pre className={`px-3 py-2 text-[11px] font-mono whitespace-pre-wrap ${
          theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
        }`}>
          {output || 'No output yet. Click Serve or Build to start.'}
        </pre>
      </div>

      {/* Serve preview iframe */}
      {serving && (
        <div className={`border-t ${border}`} style={{ height: '40%' }}>
          <iframe
            src={serveUrl}
            title="Jekyll Preview"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
