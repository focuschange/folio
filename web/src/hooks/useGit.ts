import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { GitStatusEntry, GitLogEntry } from '../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// Rust returns { status: string, path: string } — map to our frontend type
interface RustGitStatusEntry {
  status: string;
  path: string;
}

function mapGitStatus(raw: RustGitStatusEntry): GitStatusEntry {
  const s = raw.status;
  let status: GitStatusEntry['status'] = 'modified';
  let staged = false;

  if (s === '??' || s === '?') {
    status = 'untracked';
  } else if (s === 'A' || s.startsWith('A')) {
    status = 'added';
    staged = s[0] === 'A';
  } else if (s === 'M' || s.startsWith('M')) {
    status = 'modified';
    staged = s[0] === 'M';
  } else if (s === 'D' || s.startsWith('D')) {
    status = 'deleted';
    staged = s[0] === 'D';
  } else if (s === 'R' || s.startsWith('R')) {
    status = 'renamed';
    staged = s[0] === 'R';
  } else if (s === 'C' || s.startsWith('C')) {
    status = 'copied';
    staged = s[0] === 'C';
  }

  return { path: raw.path, status, staged };
}

// Rust returns { hash: string, message: string } — map to our frontend type
interface RustGitLogEntry {
  hash: string;
  message: string;
}

function mapGitLog(raw: RustGitLogEntry): GitLogEntry {
  return {
    hash: raw.hash,
    shortHash: raw.hash.slice(0, 7),
    author: '',
    date: '',
    message: raw.message,
  };
}

const mockGitStatus: GitStatusEntry[] = [
  { path: 'src/components/App.tsx', status: 'modified', staged: false },
  { path: 'src/main.tsx', status: 'modified', staged: true },
  { path: 'src/components/NewFile.tsx', status: 'untracked', staged: false },
];

const mockGitLog: GitLogEntry[] = [
  { hash: 'abc1234567890', shortHash: 'abc1234', author: 'Developer', date: '2024-12-15', message: 'Add sidebar component' },
  { hash: 'def4567890123', shortHash: 'def4567', author: 'Developer', date: '2024-12-14', message: 'Initial project setup' },
  { hash: 'ghi7890123456', shortHash: 'ghi7890', author: 'Developer', date: '2024-12-13', message: 'Configure build tools' },
];

export function useGit() {
  const { setGitBranch, setGitStatus, setGitLog } = useAppStore();
  const projectRoot = useAppStore(s => s.projectRoot);

  const fetchBranch = useCallback(async () => {
    if (isTauri && projectRoot) {
      try {
        const branch = await tauriInvoke<string>('git_branch', { path: projectRoot });
        setGitBranch(branch);
      } catch (e) {
        console.error('Failed to get git branch:', e);
      }
    } else if (!isTauri) {
      setGitBranch('main');
    }
  }, [setGitBranch, projectRoot]);

  const fetchStatus = useCallback(async () => {
    if (isTauri && projectRoot) {
      try {
        const rawStatus = await tauriInvoke<RustGitStatusEntry[]>('git_status', { path: projectRoot });
        setGitStatus(rawStatus.map(mapGitStatus));
      } catch (e) {
        console.error('Failed to get git status:', e);
      }
    } else if (!isTauri) {
      setGitStatus(mockGitStatus);
    }
  }, [setGitStatus, projectRoot]);

  const fetchLog = useCallback(async () => {
    if (isTauri && projectRoot) {
      try {
        const rawLog = await tauriInvoke<RustGitLogEntry[]>('git_log', { path: projectRoot, count: 20 });
        setGitLog(rawLog.map(mapGitLog));
      } catch (e) {
        console.error('Failed to get git log:', e);
      }
    } else if (!isTauri) {
      setGitLog(mockGitLog);
    }
  }, [setGitLog, projectRoot]);

  const stageAll = useCallback(async () => {
    if (isTauri && projectRoot) {
      try {
        await tauriInvoke('git_add', { path: projectRoot, files: ['.'] });
        await fetchStatus();
      } catch (e) {
        console.error('Failed to stage all:', e);
      }
    }
  }, [fetchStatus, projectRoot]);

  const commit = useCallback(async (message: string) => {
    if (isTauri && projectRoot) {
      try {
        await tauriInvoke('git_commit', { path: projectRoot, message });
        await fetchStatus();
        await fetchLog();
      } catch (e) {
        console.error('Failed to commit:', e);
      }
    }
  }, [fetchStatus, fetchLog, projectRoot]);

  const push = useCallback(async () => {
    if (isTauri && projectRoot) {
      try {
        await tauriInvoke('git_push', { path: projectRoot });
      } catch (e) {
        console.error('Failed to push:', e);
      }
    }
  }, [projectRoot]);

  const pull = useCallback(async () => {
    if (isTauri && projectRoot) {
      try {
        await tauriInvoke('git_pull', { path: projectRoot });
        await fetchStatus();
        await fetchLog();
      } catch (e) {
        console.error('Failed to pull:', e);
      }
    }
  }, [fetchStatus, fetchLog, projectRoot]);

  return { fetchBranch, fetchStatus, fetchLog, stageAll, commit, push, pull };
}
