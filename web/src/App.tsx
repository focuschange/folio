import { useEffect } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { useTheme } from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';
import { useFileSystem } from './hooks/useFileSystem';

function App() {
  useTheme();
  useSettings();
  const { loadDirectory } = useFileSystem();

  useEffect(() => {
    // Load mock file tree in web mode
    const isTauri = '__TAURI_INTERNALS__' in window;
    if (!isTauri) {
      loadDirectory('/project');
    }
  }, [loadDirectory]);

  return <MainLayout />;
}

export default App;
