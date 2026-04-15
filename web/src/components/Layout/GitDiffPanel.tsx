import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { DiffHunk } from '../../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export function GitDiffPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const projectRoot = useAppStore(s => s.projectRoot);
  const gitStatus = useAppStore(s => s.gitStatus);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const [hunks, setHunks] = useState<DiffHunk[]>([]);
  const [loading, setLoading] = useState(false);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

  const gitEntry = activeTab
    ? gitStatus.find(e => activeTab.path.endsWith(e.path))
    : null;

  useEffect(() => {
    if (!activeTab || !isTauri || !projectRoot || activeTab.path.startsWith('untitled-')) {
      setHunks([]);
      return;
    }

    setLoading(true);
    tauriInvoke<DiffHunk[]>('git_diff', { path: projectRoot, filePath: activeTab.path })
      .then(setHunks)
      .catch(() => setHunks([]))
      .finally(() => setLoading(false));
  }, [activeTab?.path, projectRoot]);

  if (!activeTab) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${textMuted}`}>
        No file selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${textMuted}`}>
        Loading diff...
      </div>
    );
  }

  if (hunks.length === 0 && !gitEntry) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${textMuted}`}>
        No changes
      </div>
    );
  }

  // Count additions and deletions
  let additions = 0;
  let deletions = 0;
  for (const hunk of hunks) {
    const lines = hunk.content.split('\n');
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }
  }

  return (
    <div className="overflow-y-auto h-full">
      {/* Summary */}
      <div className={`px-3 py-2 border-b ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'}`}>
        {gitEntry && (
          <div className="text-xs mb-1">
            Status: <span className="font-medium">{gitEntry.status}</span>
            {gitEntry.staged && <span className={`ml-1 ${textMuted}`}>(staged)</span>}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-400">+{additions}</span>
          <span className="text-red-400">-{deletions}</span>
        </div>
      </div>

      {/* Diff hunks */}
      {hunks.map((hunk, i) => (
        <div key={i} className={`border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <div className={`px-3 py-1 text-[10px] font-mono ${textMuted} ${
            theme === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-50'
          }`}>
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </div>
          <pre className="text-[11px] font-mono leading-tight">
            {hunk.content.split('\n').map((line, j) => {
              let bg = '';
              let textColor = '';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                bg = theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50';
                textColor = 'text-green-400';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                bg = theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50';
                textColor = 'text-red-400';
              }
              return (
                <div key={j} className={`px-3 ${bg} ${textColor}`}>
                  {line}
                </div>
              );
            })}
          </pre>
        </div>
      ))}
    </div>
  );
}
