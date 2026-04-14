import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Monitor, Type, Layout } from 'lucide-react';
import type { AppSettings } from '../../types';

type SettingsTab = 'editor' | 'appearance' | 'layout';

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

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'editor', label: 'Editor', icon: <Type size={14} /> },
    { id: 'appearance', label: 'Appearance', icon: <Monitor size={14} /> },
    { id: 'layout', label: 'Layout', icon: <Layout size={14} /> },
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
