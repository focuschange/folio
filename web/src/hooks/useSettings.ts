import { useCallback, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { AppSettings } from '../types';
import { defaultSettings } from '../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const STORAGE_KEY = 'folio-settings';

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export function useSettings() {
  const { settings, setSettings, updateSettings } = useAppStore();

  const loadSettings = useCallback(async () => {
    if (isTauri) {
      try {
        // Rust load_settings returns a JSON string
        const jsonStr = await tauriInvoke<string>('load_settings');
        if (jsonStr && jsonStr !== '{}') {
          const parsed = JSON.parse(jsonStr) as Partial<AppSettings>;
          setSettings({ ...defaultSettings, ...parsed });
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings({ ...defaultSettings, ...parsed });
        }
      } catch (e) {
        console.error('Failed to load settings from localStorage:', e);
      }
    }
  }, [setSettings]);

  const saveSettings = useCallback(async (s: AppSettings) => {
    if (isTauri) {
      try {
        // Rust save_settings expects param name: settings_json (camelCase: settingsJson)
        await tauriInvoke('save_settings', { settingsJson: JSON.stringify(s) });
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      } catch (e) {
        console.error('Failed to save settings to localStorage:', e);
      }
    }
  }, []);

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    updateSettings(partial);
    const newSettings = { ...settings, ...partial };
    await saveSettings(newSettings);
  }, [settings, updateSettings, saveSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, loadSettings, saveSettings, updateSettings: update };
}
