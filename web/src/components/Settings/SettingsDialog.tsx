import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Monitor, Type, Layout, Bot } from 'lucide-react';
import type { AppSettings, AiConfig } from '../../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

type SettingsTab = 'editor' | 'appearance' | 'layout' | 'ai';

export function SettingsDialog() {
  const theme = useAppStore(s => s.settings.theme);
  const settings = useAppStore(s => s.settings);
  const updateSettings = useAppStore(s => s.updateSettings);
  const setSettingsVisible = useAppStore(s => s.setSettingsVisible);

  const [activeTab, setActiveTab] = useState<SettingsTab>('editor');

  const bg = theme === 'dark' ? 'bg-zinc-800' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-600' : 'border-zinc-300';
  const inputBg = theme === 'dark' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-800';
  const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const tabActive = theme === 'dark' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-200 text-zinc-800';
  const tabInactive = `${textMuted} ${theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100'}`;

  // AI config state
  const [aiConfig, setAiConfig] = useState<AiConfig>({ provider: 'claude', apiKey: '', model: 'claude-sonnet-4-20250514' });
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    if (!isTauri) return;
    tauriInvoke<string>('load_ai_config')
      .then(json => {
        const cfg = JSON.parse(json);
        setAiConfig({ provider: cfg.provider || 'claude', apiKey: cfg.api_key || '', model: cfg.model || 'claude-sonnet-4-20250514' });
      })
      .catch(() => {});
  }, []);

  const saveAiConfig = async () => {
    if (!isTauri) return;
    const json = JSON.stringify({ provider: aiConfig.provider, api_key: aiConfig.apiKey, model: aiConfig.model });
    try {
      await tauriInvoke('save_ai_config', { configJson: json });
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 2000);
    } catch (e) { console.error('Failed to save AI config:', e); }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'editor', label: 'Editor', icon: <Type size={14} /> },
    { id: 'appearance', label: 'Appearance', icon: <Monitor size={14} /> },
    { id: 'layout', label: 'Layout', icon: <Layout size={14} /> },
    { id: 'ai', label: 'AI', icon: <Bot size={14} /> },
  ];

  const selectClass = `px-2 py-1.5 rounded-md text-xs ${inputBg} outline-none cursor-pointer`;
  const inputClass = `px-2 py-1.5 rounded-md text-xs ${inputBg} outline-none w-full`;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSettingsVisible(false)}>
      <div className={`${bg} border ${border} rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${border}`}>
          <h2 className="text-sm font-semibold">Settings</h2>
          <button onClick={() => setSettingsVisible(false)} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}>
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 px-4 pt-3 pb-2 border-b ${border}`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                activeTab === tab.id ? tabActive : tabInactive
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'editor' && (
            <>
              <SettingRow label="Font Family">
                <input
                  type="text"
                  value={settings.fontFamily}
                  onChange={e => update('fontFamily', e.target.value)}
                  className={inputClass}
                />
              </SettingRow>
              <SettingRow label="Font Size">
                <input
                  type="number"
                  min={8}
                  max={32}
                  value={settings.fontSize}
                  onChange={e => update('fontSize', Number(e.target.value))}
                  className={inputClass}
                />
              </SettingRow>
              <SettingRow label="Tab Size">
                <select value={settings.tabSize} onChange={e => update('tabSize', Number(e.target.value))} className={selectClass}>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                </select>
              </SettingRow>
              <SettingRow label="Word Wrap">
                <select value={settings.wordWrap} onChange={e => update('wordWrap', e.target.value as AppSettings['wordWrap'])} className={selectClass}>
                  <option value="off">Off</option>
                  <option value="on">On</option>
                  <option value="wordWrapColumn">Word Wrap Column</option>
                </select>
              </SettingRow>
              <SettingRow label="Line Numbers">
                <select value={settings.lineNumbers} onChange={e => update('lineNumbers', e.target.value as AppSettings['lineNumbers'])} className={selectClass}>
                  <option value="on">On</option>
                  <option value="off">Off</option>
                  <option value="relative">Relative</option>
                </select>
              </SettingRow>
              <SettingRow label="Cursor Style">
                <select value={settings.cursorStyle} onChange={e => update('cursorStyle', e.target.value as AppSettings['cursorStyle'])} className={selectClass}>
                  <option value="line">Line</option>
                  <option value="block">Block</option>
                  <option value="underline">Underline</option>
                </select>
              </SettingRow>
              <SettingRow label="Render Whitespace">
                <select value={settings.renderWhitespace} onChange={e => update('renderWhitespace', e.target.value as AppSettings['renderWhitespace'])} className={selectClass}>
                  <option value="none">None</option>
                  <option value="boundary">Boundary</option>
                  <option value="all">All</option>
                </select>
              </SettingRow>
              <SettingToggle label="Auto Save" checked={settings.autoSave} onChange={v => update('autoSave', v)} theme={theme} />
              <SettingToggle label="Bracket Pair Colorization" checked={settings.bracketPairColorization} onChange={v => update('bracketPairColorization', v)} theme={theme} />
              <SettingToggle label="Smooth Scrolling" checked={settings.smoothScrolling} onChange={v => update('smoothScrolling', v)} theme={theme} />
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <SettingRow label="Theme">
                <select value={settings.theme} onChange={e => update('theme', e.target.value as 'dark' | 'light')} className={selectClass}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </SettingRow>
              <SettingToggle label="Minimap" checked={settings.minimap} onChange={v => update('minimap', v)} theme={theme} />
            </>
          )}

          {activeTab === 'layout' && (
            <>
              <SettingRow label="Editor Padding">
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={settings.editorPadding}
                  onChange={e => update('editorPadding', Number(e.target.value))}
                  className={inputClass}
                />
              </SettingRow>
            </>
          )}

          {activeTab === 'ai' && (
            <>
              <SettingRow label="Provider">
                <select
                  value={aiConfig.provider}
                  onChange={e => {
                    const p = e.target.value;
                    const defaultModel = p === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514';
                    setAiConfig(c => ({ ...c, provider: p, model: defaultModel, apiKey: '' }));
                  }}
                  className={selectClass}
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="openai">OpenAI</option>
                </select>
              </SettingRow>
              <SettingRow label="API Key">
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={e => setAiConfig(c => ({ ...c, apiKey: e.target.value }))}
                  placeholder={aiConfig.provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                  className={inputClass}
                />
              </SettingRow>
              <SettingRow label="Model">
                <select
                  value={aiConfig.model}
                  onChange={e => setAiConfig(c => ({ ...c, model: e.target.value }))}
                  className={selectClass}
                >
                  {aiConfig.provider === 'claude' ? (
                    <>
                      <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                      <option value="claude-haiku-4-20250514">Claude Haiku 4</option>
                      <option value="claude-opus-4-20250514">Claude Opus 4</option>
                    </>
                  ) : (
                    <>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="o3-mini">o3-mini</option>
                    </>
                  )}
                </select>
              </SettingRow>
              <div className="flex items-center justify-end gap-2 pt-2">
                {aiSaved && <span className="text-xs text-green-400">Saved!</span>}
                <button
                  onClick={saveAiConfig}
                  className="px-3 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-500"
                >
                  Save AI Settings
                </button>
              </div>
              <div className={`text-[10px] ${textMuted} mt-2`}>
                API 키는 로컬에만 저장됩니다 (<code>~/.folio/ai-config.json</code>).
                {aiConfig.provider === 'claude'
                  ? ' Anthropic API에 직접 연결됩니다.'
                  : ' OpenAI API에 직접 연결됩니다.'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-xs shrink-0">{label}</label>
      <div className="flex-1 max-w-[200px]">{children}</div>
    </div>
  );
}

function SettingToggle({ label, checked, onChange, theme }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; theme: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-xs">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative ${
          checked ? 'bg-blue-600' : theme === 'dark' ? 'bg-zinc-600' : 'bg-zinc-300'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}
