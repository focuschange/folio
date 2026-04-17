import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ArrowRightLeft, Plus, Trash2, RefreshCw, Power, PowerOff } from 'lucide-react';
import type { SshTunnel } from '../../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export function SshTunnelPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const [tunnels, setTunnels] = useState<SshTunnel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ connectionId: '', localPort: '8080', remoteHost: 'localhost', remotePort: '3306' });

  const loadTunnels = useCallback(async () => {
    if (!isTauri) return;
    try {
      const list = await tauriInvoke<SshTunnel[]>('ssh_list_tunnels');
      setTunnels(list);
    } catch { setTunnels([]); }
  }, []);

  useEffect(() => { loadTunnels(); }, [loadTunnels]);

  const openTunnel = async () => {
    setError(null);
    try {
      await tauriInvoke('ssh_open_tunnel', {
        connectionId: form.connectionId,
        localPort: parseInt(form.localPort),
        remoteHost: form.remoteHost,
        remotePort: parseInt(form.remotePort),
      });
      setShowForm(false);
      loadTunnels();
    } catch (e) {
      setError(String(e));
    }
  };

  const closeTunnel = async (id: string) => {
    try {
      await tauriInvoke('ssh_close_tunnel', { id });
      loadTunnels();
    } catch (e) {
      setError(String(e));
    }
  };

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';
  const inputBg = theme === 'dark' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800';

  return (
    <div className={`h-full flex flex-col ${bg} overflow-hidden`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${border}`}>
        <ArrowRightLeft size={14} className="text-purple-400" />
        <span className="text-xs font-medium flex-1">SSH Tunnels</span>
        <button onClick={loadTunnels} className={`p-0.5 rounded ${textMuted} hover:text-purple-400`}>
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
        {showForm && (
          <div className={`px-3 py-2 border-b ${border} space-y-1.5`}>
            <input value={form.connectionId} onChange={e => setForm({ ...form, connectionId: e.target.value })}
              placeholder="SSH Connection ID" className={`w-full px-2 py-1 rounded text-xs ${inputBg} outline-none`} />
            <div className="flex gap-1 items-center">
              <input value={form.localPort} onChange={e => setForm({ ...form, localPort: e.target.value })}
                placeholder="Local Port" className={`w-20 px-2 py-1 rounded text-xs ${inputBg} outline-none`} />
              <ArrowRightLeft size={12} className={textMuted} />
              <input value={form.remoteHost} onChange={e => setForm({ ...form, remoteHost: e.target.value })}
                placeholder="Remote Host" className={`flex-1 px-2 py-1 rounded text-xs ${inputBg} outline-none`} />
              <span className={`text-xs ${textMuted}`}>:</span>
              <input value={form.remotePort} onChange={e => setForm({ ...form, remotePort: e.target.value })}
                placeholder="Port" className={`w-16 px-2 py-1 rounded text-xs ${inputBg} outline-none`} />
            </div>
            <button onClick={openTunnel} disabled={!form.connectionId || !form.localPort}
              className="w-full px-2 py-1.5 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40">
              Open Tunnel
            </button>
          </div>
        )}

        {tunnels.length === 0 && !showForm ? (
          <div className={`px-3 py-6 text-center text-xs ${textMuted}`}>
            <ArrowRightLeft size={24} className="mx-auto mb-2 opacity-30" />
            No active tunnels
            <p className="mt-1 text-[10px]">Click + to create a tunnel</p>
          </div>
        ) : (
          tunnels.map(tunnel => (
            <div key={tunnel.id} className={`flex items-center gap-2 px-3 py-1.5 ${hoverBg} group`}>
              {tunnel.active ? (
                <Power size={12} className="text-green-400 shrink-0" />
              ) : (
                <PowerOff size={12} className="text-red-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate">
                  <span className="font-mono">:{tunnel.localPort}</span>
                  <span className={`mx-1 ${textMuted}`}>→</span>
                  <span className="font-mono">{tunnel.remoteHost}:{tunnel.remotePort}</span>
                </div>
              </div>
              <button
                onClick={() => closeTunnel(tunnel.id)}
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
