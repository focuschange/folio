import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useGit } from '../../hooks/useGit';
import {
  GitBranch, GitCommit, Upload, Download,
  Plus, FileText, Trash2, FilePlus,
} from 'lucide-react';

export function GitPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const gitBranch = useAppStore(s => s.gitBranch);
  const gitStatus = useAppStore(s => s.gitStatus);
  const gitLog = useAppStore(s => s.gitLog);
  const { fetchBranch, fetchStatus, fetchLog, stageAll, commit, push, pull } = useGit();

  const [commitMessage, setCommitMessage] = useState('');

  useEffect(() => {
    fetchBranch();
    fetchStatus();
    fetchLog();
  }, [fetchBranch, fetchStatus, fetchLog]);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    await commit(commitMessage);
    setCommitMessage('');
  };

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const inputBg = theme === 'dark' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';
  const btnBg = theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-200 hover:bg-zinc-300';

  const statusIcon = (status: string) => {
    switch (status) {
      case 'added': case 'untracked': return <FilePlus size={12} className="text-green-400" />;
      case 'modified': return <FileText size={12} className="text-yellow-400" />;
      case 'deleted': return <Trash2 size={12} className="text-red-400" />;
      default: return <FileText size={12} />;
    }
  };

  return (
    <div className={`h-full flex flex-col ${bg} border-l ${border} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${border}`}>
        <GitBranch size={14} className="text-blue-400" />
        <span className="text-xs font-medium">{gitBranch || 'No branch'}</span>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-1 px-3 py-2 border-b ${border}`}>
        <button onClick={stageAll} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg}`}>
          <Plus size={12} /> Stage All
        </button>
        <button onClick={push} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg}`}>
          <Upload size={12} /> Push
        </button>
        <button onClick={pull} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg}`}>
          <Download size={12} /> Pull
        </button>
      </div>

      {/* Commit */}
      <div className={`px-3 py-2 border-b ${border}`}>
        <textarea
          value={commitMessage}
          onChange={e => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          rows={3}
          className={`w-full px-2 py-1.5 rounded-md text-xs resize-none ${inputBg} outline-none`}
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim()}
          className="w-full mt-1 px-2 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Commit
        </button>
      </div>

      {/* Changes */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${textMuted} border-b ${border}`}>
          Changes ({gitStatus.length})
        </div>
        {gitStatus.length === 0 ? (
          <div className={`px-3 py-3 text-xs text-center ${textMuted}`}>No changes</div>
        ) : (
          gitStatus.map((entry, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1 text-xs ${hoverBg} cursor-default`}>
              {statusIcon(entry.status)}
              <span className="truncate flex-1">{entry.path}</span>
              <span className={`text-[10px] ${textMuted}`}>
                {entry.staged ? 'staged' : entry.status}
              </span>
            </div>
          ))
        )}

        {/* Log */}
        <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${textMuted} border-t border-b ${border} mt-2`}>
          Recent Commits
        </div>
        {gitLog.map((entry, i) => (
          <div key={i} className={`px-3 py-1.5 ${hoverBg} cursor-default`}>
            <div className="flex items-center gap-1.5 text-xs">
              <GitCommit size={12} className="text-blue-400 shrink-0" />
              <span className="truncate">{entry.message}</span>
            </div>
            <div className={`ml-5 text-[10px] ${textMuted}`}>
              {entry.shortHash} - {entry.author} - {entry.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
