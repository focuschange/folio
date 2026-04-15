import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { countWords, countLines } from '../../utils/markdownUtils';
import type { FileInfo } from '../../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: string }) {
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  return (
    <div className="flex items-start gap-2 px-3 py-1">
      <span className={`text-[11px] w-20 shrink-0 ${textMuted}`}>{label}</span>
      <span className="text-xs break-all">{value}</span>
    </div>
  );
}

export function FileInfoPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const gitStatus = useAppStore(s => s.gitStatus);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

  useEffect(() => {
    if (!activeTab || !isTauri || activeTab.path.startsWith('untitled-')) {
      setFileInfo(null);
      return;
    }
    tauriInvoke<FileInfo>('get_file_info', { path: activeTab.path })
      .then(setFileInfo)
      .catch(() => setFileInfo(null));
  }, [activeTab?.path]);

  const stats = useMemo(() => {
    if (!activeTab) return null;
    const content = activeTab.content;
    return {
      lines: countLines(content),
      words: countWords(content),
      characters: content.length,
    };
  }, [activeTab?.content]);

  const gitEntry = useMemo(() => {
    if (!activeTab) return null;
    return gitStatus.find(e => activeTab.path.endsWith(e.path));
  }, [activeTab?.path, gitStatus]);

  if (!activeTab) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${textMuted}`}>
        No file selected
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full py-1">
      <InfoRow label="Filename" value={activeTab.name} theme={theme} />
      <InfoRow label="Path" value={activeTab.path} theme={theme} />
      <InfoRow label="Language" value={activeTab.language || 'plain text'} theme={theme} />
      <InfoRow label="Encoding" value={activeTab.encoding} theme={theme} />
      {stats && (
        <>
          <InfoRow label="Lines" value={String(stats.lines)} theme={theme} />
          <InfoRow label="Words" value={String(stats.words)} theme={theme} />
          <InfoRow label="Characters" value={String(stats.characters)} theme={theme} />
        </>
      )}
      {fileInfo && (
        <>
          <InfoRow label="Size" value={formatBytes(fileInfo.size)} theme={theme} />
          <InfoRow label="Modified" value={fileInfo.modified} theme={theme} />
          <InfoRow label="Read-only" value={fileInfo.isReadOnly ? 'Yes' : 'No'} theme={theme} />
        </>
      )}
      {gitEntry && (
        <InfoRow
          label="Git status"
          value={`${gitEntry.status}${gitEntry.staged ? ' (staged)' : ''}`}
          theme={theme}
        />
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
