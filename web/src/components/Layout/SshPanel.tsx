import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Server, FolderOpen, File, RefreshCw, Plus, Trash2, Link2, ArrowLeft } from 'lucide-react';
import type { SshConnection } from '../../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

interface RemoteEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

export function SshPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const openTab = useAppStore(s => s.openTab);
  const [connections, setConnections] = useState<SshConnection[]>([]);
  const [activeConn, setActiveConn] = useState<string | null>(null);
  const [remotePath, setRemotePath] = useState('/');
  const [remoteEntries, setRemoteEntries] = useState<RemoteEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', host: '', port: '22', username: '', password: '', authType: 'password' as 'password' | 'key', keyPath: '' });

  const loadConnections = useCallback(async () => {
    if (!isTauri) return;
    try {
      const data = await tauriInvoke<string>('load_ssh_connections');
      setConnections(JSON.parse(data));
    } catch { setConnections([]); }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const saveConnections = async (conns: SshConnection[]) => {
    if (!isTauri) return;
    try {
      await tauriInvoke('save_ssh_connections', { data: JSON.stringify(conns) });
    } catch { /* ignore */ }
  };

  const addConnection = () => {
    const conn: SshConnection = {
      id: `ssh-${Date.now()}`,
      name: form.name || `${form.username}@${form.host}`,
      host: form.host,
      port: parseInt(form.port) || 22,
      username: form.username,
      authType: form.authType,
      keyPath: form.authType === 'key' ? form.keyPath : undefined,
    };
    const newConns = [...connections, conn];
    setConnections(newConns);
    saveConnections(newConns);
    setShowForm(false);
    setForm({ name: '', host: '', port: '22', username: '', password: '', authType: 'password', keyPath: '' });
  };

  const removeConnection = (id: string) => {
    const newConns = connections.filter(c => c.id !== id);
    setConnections(newConns);
    saveConnections(newConns);
    if (activeConn === id) {
      setActiveConn(null);
      setRemoteEntries([]);
    }
  };

  const connect = async (conn: SshConnection) => {
    setLoading(true);
    setError(null);
    try {
      await tauriInvoke('ssh_connect', {
        id: conn.id,
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: form.password || null,
        keyPath: conn.keyPath || null,
      });
      setActiveConn(conn.id);
      await listDirectory(conn.id, '/home/' + conn.username);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  const listDirectory = async (connId: string, path: string) => {
    setLoading(true);
    try {
      const entries = await tauriInvoke<RemoteEntry[]>('ssh_list_directory', { id: connId, path });
      setRemoteEntries(entries);
      setRemotePath(path);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  const openRemoteFile = async (connId: string, path: string, name: string) => {
    setLoading(true);
    try {
      const content = await tauriInvoke<string>('ssh_read_file', { id: connId, path });
      openTab(`ssh://${connId}${path}`, `[SSH] ${name}`, content);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  const disconnect = async () => {
    if (activeConn) {
      try { await tauriInvoke('ssh_disconnect', { id: activeConn }); } catch { /* ignore */ }
    }
    setActiveConn(null);
    setRemoteEntries([]);
    setRemotePath('/');
  };

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';
  const inputBg = theme === 'dark' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800';
  const btnBg = theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-200 hover:bg-zinc-300';

  // Connected view: remote file browser
  if (activeConn) {
    const parentPath = remotePath.split('/').slice(0, -1).join('/') || '/';
    return (
      <div className={`h-full flex flex-col ${bg} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-3 py-2 border-b ${border}`}>
          <Server size={14} className="text-green-400" />
          <span className="text-xs font-medium flex-1 truncate">{remotePath}</span>
          <button onClick={disconnect} className={`text-[10px] px-1.5 py-0.5 rounded ${btnBg} text-red-400`}>
            Disconnect
          </button>
        </div>
        {error && (
          <div className="px-3 py-1.5 text-[11px] bg-red-900/30 text-red-400">{error}</div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {remotePath !== '/' && (
            <button
              onClick={() => listDirectory(activeConn, parentPath)}
              className={`w-full flex items-center gap-2 px-3 py-1 text-xs ${hoverBg}`}
            >
              <ArrowLeft size={12} className={textMuted} />
              <span>.. (up)</span>
            </button>
          )}
          {remoteEntries.map(entry => (
            <button
              key={entry.path}
              onClick={() => entry.isDir
                ? listDirectory(activeConn, entry.path)
                : openRemoteFile(activeConn, entry.path, entry.name)
              }
              className={`w-full flex items-center gap-2 px-3 py-1 text-xs ${hoverBg}`}
            >
              {entry.isDir
                ? <FolderOpen size={12} className="text-yellow-400" />
                : <File size={12} className={textMuted} />
              }
              <span className="truncate flex-1">{entry.name}</span>
              {!entry.isDir && (
                <span className={`text-[10px] ${textMuted}`}>{(entry.size / 1024).toFixed(1)}K</span>
              )}
            </button>
          ))}
          {loading && <div className={`px-3 py-2 text-xs ${textMuted}`}>Loading...</div>}
        </div>
      </div>
    );
  }

  // Connection list
  return (
    <div className={`h-full flex flex-col ${bg} overflow-hidden`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${border}`}>
        <Server size={14} className="text-blue-400" />
        <span className="text-xs font-medium flex-1">SSH Connections</span>
        <button onClick={loadConnections} className={`p-0.5 rounded ${textMuted} hover:text-blue-400`}>
          <RefreshCw size={12} />
        </button>
        <button onClick={() => setShowForm(!showForm)} className={`p-0.5 rounded ${textMuted} hover:text-green-400`}>
          <Plus size={12} />
        </button>
      </div>

      {error && (
        <div className="px-3 py-1.5 text-[11px] bg-red-900/30 text-red-400">{error}</div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* New connection form */}
        {showForm && (
          <div className={`px-3 py-2 border-b ${border} space-y-1.5`}>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Name (optional)" className={`w-full px-2 py-1 rounded text-xs ${inputBg} outline-none`} />
            <input value={form.host} onChange={e => setForm({ ...form, host: e.target.value })}
              placeholder="Host" className={`w-full px-2 py-1 rounded text-xs ${inputBg} outline-none`} />
            <div className="flex gap-1">
              <input value={form.port} onChange={e => setForm({ ...form, port: e.target.value })}
                placeholder="Port" className={`w-16 px-2 py-1 rounded text-xs ${inputBg} outline-none`} />
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="Username" className={`flex-1 px-2 py-1 rounded text-xs ${inputBg} outline-none`} />
            </div>
            <select
              value={form.authType}
              onChange={e => setForm({ ...form, authType: e.target.value as 'password' | 'key' })}
              className={`w-full px-2 py-1 rounded text-xs ${inputBg} outline-none`}
            >
              <option value="password">Password</option>
              <option value="key">SSH Key</option>
            </select>
            {form.authType === 'key' && (
              <input value={form.keyPath} onChange={e => setForm({ ...form, keyPath: e.target.value })}
                placeholder="Key path (~/.ssh/id_rsa)" className={`w-full px-2 py-1 rounded text-xs ${inputBg} outline-none`} />
            )}
            <button onClick={addConnection} disabled={!form.host || !form.username}
              className="w-full px-2 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40">
              Save Connection
            </button>
          </div>
        )}

        {/* Connection list */}
        {connections.length === 0 && !showForm ? (
          <div className={`px-3 py-6 text-center text-xs ${textMuted}`}>
            <Server size={24} className="mx-auto mb-2 opacity-30" />
            No SSH connections
            <p className="mt-1 text-[10px]">Click + to add a connection</p>
          </div>
        ) : (
          connections.map(conn => (
            <div
              key={conn.id}
              className={`flex items-center gap-2 px-3 py-1.5 ${hoverBg} group`}
            >
              <Link2 size={12} className={textMuted} />
              <button
                onClick={() => connect(conn)}
                className="flex-1 text-left text-xs truncate"
              >
                <span className="font-medium">{conn.name}</span>
                <span className={`ml-1 text-[10px] ${textMuted}`}>
                  {conn.username}@{conn.host}:{conn.port}
                </span>
              </button>
              <button
                onClick={() => removeConnection(conn.id)}
                className={`${textMuted} opacity-0 group-hover:opacity-100 hover:text-red-400`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
