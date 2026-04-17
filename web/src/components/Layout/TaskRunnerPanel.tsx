import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Play, Square, RefreshCw, Terminal, CheckCircle2, XCircle } from 'lucide-react';
import type { TaskDef, CommandOutput } from '../../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

function parsePackageJson(content: string): TaskDef[] {
  try {
    const pkg = JSON.parse(content);
    if (!pkg.scripts) return [];
    return Object.entries(pkg.scripts).map(([name]) => ({
      name,
      command: `npm run ${name}`,
      source: 'package.json',
    }));
  } catch { return []; }
}

function parseMakefile(content: string): TaskDef[] {
  const tasks: TaskDef[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z_][\w-]*)\s*:/);
    if (m && !m[1].startsWith('.')) {
      tasks.push({ name: m[1], command: `make ${m[1]}`, source: 'Makefile' });
    }
  }
  return tasks;
}

function parseGradleBuild(content: string): TaskDef[] {
  const tasks: TaskDef[] = [];
  const re = /task\s+['"]?(\w+)['"]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    tasks.push({ name: m[1], command: `./gradlew ${m[1]}`, source: 'build.gradle.kts' });
  }
  // Common gradle tasks
  for (const name of ['build', 'clean', 'test', 'run']) {
    if (!tasks.find(t => t.name === name)) {
      tasks.push({ name, command: `./gradlew ${name}`, source: 'build.gradle.kts' });
    }
  }
  return tasks;
}

export function TaskRunnerPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const projectRoots = useAppStore(s => s.projectRoots);
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState<{ stdout: string; stderr: string; exitCode: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!isTauri || projectRoots.length === 0) return;
    setLoading(true);
    const allTasks: TaskDef[] = [];
    const root = projectRoots[0];

    // Try package.json
    try {
      const content = await tauriInvoke<string>('read_file', { path: `${root}/package.json` });
      allTasks.push(...parsePackageJson(content));
    } catch { /* no package.json */ }

    // Try Makefile
    try {
      const content = await tauriInvoke<string>('read_file', { path: `${root}/Makefile` });
      allTasks.push(...parseMakefile(content));
    } catch { /* no Makefile */ }

    // Try build.gradle.kts
    try {
      const content = await tauriInvoke<string>('read_file', { path: `${root}/build.gradle.kts` });
      allTasks.push(...parseGradleBuild(content));
    } catch {
      // Try build.gradle
      try {
        const content = await tauriInvoke<string>('read_file', { path: `${root}/build.gradle` });
        allTasks.push(...parseGradleBuild(content));
      } catch { /* no gradle */ }
    }

    setTasks(allTasks);
    setLoading(false);
  }, [projectRoots]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const runTask = async (task: TaskDef) => {
    if (!isTauri || running) return;
    setRunning(task.name);
    setOutput(null);
    try {
      const result = await tauriInvoke<CommandOutput>('run_command', {
        command: task.command,
        cwd: projectRoots[0] ?? null,
      });
      setOutput(result);
    } catch (e) {
      setOutput({ stdout: '', stderr: String(e), exitCode: -1 });
    }
    setRunning(null);
  };

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';

  // Group by source
  const groups = tasks.reduce<Record<string, TaskDef[]>>((acc, t) => {
    (acc[t.source] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className={`h-full flex flex-col ${bg} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${border}`}>
        <Terminal size={14} className="text-green-400" />
        <span className="text-xs font-medium flex-1">Tasks</span>
        <button
          onClick={loadTasks}
          className={`p-0.5 rounded ${textMuted} hover:text-green-400 ${loading ? 'animate-spin' : ''}`}
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className={`px-3 py-6 text-center text-xs ${textMuted}`}>
            <Terminal size={24} className="mx-auto mb-2 opacity-30" />
            {loading ? 'Loading tasks...' : 'No tasks found'}
            <p className="mt-1 text-[10px]">Supports package.json, Makefile, build.gradle</p>
          </div>
        ) : (
          Object.entries(groups).map(([source, items]) => (
            <div key={source}>
              <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${textMuted} border-b ${border}`}>
                {source}
              </div>
              {items.map(task => (
                <button
                  key={`${source}-${task.name}`}
                  onClick={() => runTask(task)}
                  disabled={running !== null}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left ${hoverBg} group disabled:opacity-50`}
                >
                  {running === task.name ? (
                    <Square size={12} className="text-red-400 shrink-0" />
                  ) : (
                    <Play size={12} className={`${textMuted} group-hover:text-green-400 shrink-0`} />
                  )}
                  <span className="truncate flex-1">{task.name}</span>
                  <code className={`text-[10px] ${textMuted} truncate max-w-[100px]`}>{task.command}</code>
                </button>
              ))}
            </div>
          ))
        )}

        {/* Output */}
        {output && (
          <div className={`border-t ${border} mt-2`}>
            <div className={`px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${textMuted} border-b ${border}`}>
              {output.exitCode === 0 ? (
                <CheckCircle2 size={12} className="text-green-400" />
              ) : (
                <XCircle size={12} className="text-red-400" />
              )}
              Output (exit: {output.exitCode})
            </div>
            <pre className={`px-3 py-2 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto ${
              theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              {output.stdout || output.stderr || '(no output)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
