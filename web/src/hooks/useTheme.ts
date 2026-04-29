import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useTheme() {
  const theme = useAppStore(s => s.settings.theme);
  const updateSettings = useAppStore(s => s.updateSettings);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    root.style.colorScheme = theme;
    // Mirror to localStorage so index.html's pre-React script can apply the
    // correct theme on next launch synchronously (no flash).
    try { localStorage.setItem('folio-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => {
    updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
  };

  return { theme, toggleTheme };
}
