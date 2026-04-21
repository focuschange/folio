import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useGit } from '../../hooks/useGit';
import {
  GitBranch, GitCommit, Upload, Download,
  Plus, FileText, Trash2, FilePlus, RefreshCw, Sparkles, Square,
} from 'lucide-react';
import { streamAiChat, type StreamController } from '../../utils/aiStream';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

const COMMIT_MESSAGE_SYSTEM_PROMPT =
  "You are a git commit message generator. Given a staged diff, produce ONE Conventional Commits message. " +
  "Format: `type(scope): subject` where type ∈ {feat, fix, docs, style, refactor, test, chore, perf}. " +
  "Subject: imperative mood, lowercase, no period, under 72 chars. " +
  "Optionally add a blank line and a short body if the change needs context. " +
  "Output ONLY the commit message — no explanation, no markdown fences, no quotes.";

export function GitPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const gitBranch = useAppStore(s => s.gitBranch);
  const gitStatus = useAppStore(s => s.gitStatus);
  const gitLog = useAppStore(s => s.gitLog);
  const projectRoot = useAppStore(s => s.projectRoot);
  const { fetchBranch, fetchStatus, fetchLog, stageAll, commit, push, pull } = useGit();

  const [commitMessage, setCommitMessage] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const genStreamRef = useRef<StreamController | null>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBranch(), fetchStatus(), fetchLog()]);
    } finally {
      setLoading(false);
    }
  }, [fetchBranch, fetchStatus, fetchLog]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    try {
      await commit(commitMessage);
      setCommitMessage('');
      showFeedback('success', 'Committed successfully');
    } catch {
      showFeedback('error', 'Commit failed');
    }
  };

  const handleStageAll = async () => {
    try {
      await stageAll();
      showFeedback('success', 'All files staged');
    } catch {
      showFeedback('error', 'Stage failed');
    }
  };

  const handlePush = async () => {
    try {
      await push();
      showFeedback('success', 'Pushed to remote');
    } catch {
      showFeedback('error', 'Push failed');
    }
  };

  const handlePull = async () => {
    try {
      await pull();
      showFeedback('success', 'Pulled from remote');
    } catch {
      showFeedback('error', 'Pull failed');
    }
  };

  const handleGenerateCommitMessage = async () => {
    if (generating) {
      // Clicking while generating = stop
      genStreamRef.current?.cancel();
      genStreamRef.current = null;
      setGenerating(false);
      return;
    }
    if (!isTauri || !projectRoot) {
      showFeedback('error', 'Project root not set');
      return;
    }
    try {
      const diff = await tauriInvoke<string>('git_diff_staged_raw', { path: projectRoot });
      if (!diff.trim()) {
        showFeedback('error', 'No staged changes to summarize. Run Stage All first.');
        return;
      }
      // Truncate very large diffs to keep token cost sane — first ~20000 chars
      const truncated = diff.length > 20000 ? diff.slice(0, 20000) + '\n\n[…truncated…]' : diff;
      setCommitMessage('');
      setGenerating(true);

      const ctrl = await streamAiChat(
        {
          messages: [{ role: 'user', content: `Generate a Conventional Commits message for this diff:\n\n${truncated}` }],
          systemOverride: COMMIT_MESSAGE_SYSTEM_PROMPT,
        },
        {
          onChunk: (delta) => setCommitMessage(prev => prev + delta),
          onDone: (full) => {
            setCommitMessage(full.trim());
            setGenerating(false);
            genStreamRef.current = null;
          },
          onError: (err) => {
            showFeedback('error', err);
            setGenerating(false);
            genStreamRef.current = null;
          },
        },
      );
      genStreamRef.current = ctrl;
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : String(e));
      setGenerating(false);
    }
  };

  useEffect(() => {
    // Cancel any in-flight AI generation on unmount
    return () => genStreamRef.current?.cancel();
  }, []);

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
    <div className={`h-full flex flex-col ${bg} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${border}`}>
        <GitBranch size={14} className="text-blue-400" />
        <span className="text-xs font-medium flex-1">{gitBranch || 'No branch'}</span>
        <button
          onClick={refreshAll}
          className={`p-0.5 rounded ${textMuted} hover:text-blue-400 ${loading ? 'animate-spin' : ''}`}
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`px-3 py-1.5 text-[11px] ${
          feedback.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
        }`}>
          {feedback.msg}
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center gap-1 px-3 py-2 border-b ${border}`}>
        <button onClick={handleStageAll} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg}`}>
          <Plus size={12} /> Stage All
        </button>
        <button onClick={handlePush} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg}`}>
          <Upload size={12} /> Push
        </button>
        <button onClick={handlePull} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${btnBg}`}>
          <Download size={12} /> Pull
        </button>
      </div>

      {/* Commit */}
      <div className={`px-3 py-2 border-b ${border}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] uppercase tracking-wider ${textMuted}`}>Commit Message</span>
          <button
            onClick={handleGenerateCommitMessage}
            disabled={!isTauri || !projectRoot}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
              generating
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-blue-600/80 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title={generating ? 'Stop generating' : 'Generate from staged diff'}
          >
            {generating ? <Square size={10} /> : <Sparkles size={10} />}
            <span>{generating ? 'Stop' : 'Generate'}</span>
          </button>
        </div>
        <textarea
          value={commitMessage}
          onChange={e => setCommitMessage(e.target.value)}
          placeholder={generating ? 'Generating…' : 'Commit message...'}
          rows={3}
          disabled={generating}
          className={`w-full px-2 py-1.5 rounded-md text-xs resize-none ${inputBg} outline-none disabled:opacity-70`}
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || generating}
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
