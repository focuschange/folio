import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { isEditableFile } from '../utils/fileIcons';
import type { FileEntry } from '../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// Mock file tree for web dev mode
const mockFileTree: FileEntry[] = [
  {
    name: 'src', path: '/project/src', isDir: true, children: [
      {
        name: 'components', path: '/project/src/components', isDir: true, children: [
          { name: 'App.tsx', path: '/project/src/components/App.tsx', isDir: false, size: 1250 },
          { name: 'Header.tsx', path: '/project/src/components/Header.tsx', isDir: false, size: 890 },
          { name: 'Sidebar.tsx', path: '/project/src/components/Sidebar.tsx', isDir: false, size: 1560 },
        ]
      },
      {
        name: 'hooks', path: '/project/src/hooks', isDir: true, children: [
          { name: 'useTheme.ts', path: '/project/src/hooks/useTheme.ts', isDir: false, size: 420 },
          { name: 'useStore.ts', path: '/project/src/hooks/useStore.ts', isDir: false, size: 1800 },
        ]
      },
      { name: 'main.tsx', path: '/project/src/main.tsx', isDir: false, size: 345 },
      { name: 'index.css', path: '/project/src/index.css', isDir: false, size: 2100 },
    ]
  },
  {
    name: 'docs', path: '/project/docs', isDir: true, children: [
      { name: 'README.md', path: '/project/docs/README.md', isDir: false, size: 3200 },
      { name: 'CHANGELOG.md', path: '/project/docs/CHANGELOG.md', isDir: false, size: 5600 },
    ]
  },
  { name: 'package.json', path: '/project/package.json', isDir: false, size: 780 },
  { name: 'tsconfig.json', path: '/project/tsconfig.json', isDir: false, size: 430 },
  { name: 'vite.config.ts', path: '/project/vite.config.ts', isDir: false, size: 320 },
  { name: '.gitignore', path: '/project/.gitignore', isDir: false, size: 120 },
  { name: 'README.md', path: '/project/README.md', isDir: false, size: 2400 },
];

const mockFileContents: Record<string, string> = {
  '/project/src/components/App.tsx': `import { useState } from 'react';\nimport { Header } from './Header';\nimport { Sidebar } from './Sidebar';\n\nexport function App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div className="app">\n      <Header />\n      <div className="main">\n        <Sidebar />\n        <main>\n          <h1>Welcome to Folio</h1>\n          <p>A beautiful text editor</p>\n          <button onClick={() => setCount(c => c + 1)}>\n            Count: {count}\n          </button>\n        </main>\n      </div>\n    </div>\n  );\n}\n`,
  '/project/src/components/Header.tsx': `export function Header() {\n  return (\n    <header className="header">\n      <h1>Folio Editor</h1>\n      <nav>\n        <a href="#file">File</a>\n        <a href="#edit">Edit</a>\n        <a href="#view">View</a>\n      </nav>\n    </header>\n  );\n}\n`,
  '/project/src/main.tsx': `import { createRoot } from 'react-dom/client';\nimport { App } from './components/App';\nimport './index.css';\n\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<App />);\n`,
  '/project/docs/README.md': `# Folio Editor\n\nA modern, beautiful text editor built with **React** and **TypeScript**.\n\n## Features\n\n- Syntax highlighting for 40+ languages\n- Markdown preview with KaTeX math support\n- Git integration\n- File tree with icons\n- Multiple tabs with drag & drop\n- Dark and light themes\n- Search across project\n- Terminal integration\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Math Support\n\nInline: $E = mc^2$\n\nBlock:\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n$$\n\n## Code Example\n\n\`\`\`typescript\nconst greeting = (name: string): string => {\n  return \`Hello, \${name}!\`;\n};\n\`\`\`\n\n| Feature | Status |\n| --- | --- |\n| Syntax Highlighting | Done |\n| Markdown Preview | Done |\n| Git Integration | Done |\n| Terminal | Done |\n`,
  '/project/package.json': `{\n  "name": "folio",\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build",\n    "preview": "vite preview"\n  },\n  "dependencies": {\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0"\n  }\n}\n`,
  '/project/tsconfig.json': `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "ESNext",\n    "lib": ["ES2020", "DOM"],\n    "jsx": "react-jsx",\n    "strict": true\n  },\n  "include": ["src"]\n}\n`,
  '/project/vite.config.ts': `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`,
  '/project/.gitignore': `node_modules/\ndist/\n.env\n*.log\n`,
  '/project/README.md': `# Project\n\nThis is the root README.\n`,
  '/project/src/index.css': `@import "tailwindcss";\n\n:root {\n  font-family: system-ui, sans-serif;\n}\n\nbody {\n  margin: 0;\n  min-height: 100vh;\n}\n`,
  '/project/src/hooks/useTheme.ts': `import { useState, useEffect } from 'react';\n\nexport function useTheme() {\n  const [theme, setTheme] = useState<'dark' | 'light'>('dark');\n\n  useEffect(() => {\n    document.documentElement.className = theme;\n  }, [theme]);\n\n  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');\n\n  return { theme, setTheme, toggle };\n}\n`,
  '/project/src/hooks/useStore.ts': `import { create } from 'zustand';\n\ninterface AppState {\n  count: number;\n  increment: () => void;\n  decrement: () => void;\n  reset: () => void;\n}\n\nexport const useStore = create<AppState>((set) => ({\n  count: 0,\n  increment: () => set((s) => ({ count: s.count + 1 })),\n  decrement: () => set((s) => ({ count: s.count - 1 })),\n  reset: () => set({ count: 0 }),\n}));\n`,
  '/project/src/components/Sidebar.tsx': `import { useState } from 'react';\n\ninterface SidebarProps {\n  className?: string;\n}\n\nexport function Sidebar({ className }: SidebarProps) {\n  const [collapsed, setCollapsed] = useState(false);\n\n  return (\n    <aside className={\`sidebar \${collapsed ? 'collapsed' : ''} \${className ?? ''}\`}>\n      <button onClick={() => setCollapsed(!collapsed)}>\n        {collapsed ? '>' : '<'}\n      </button>\n      <nav>\n        <ul>\n          <li>Files</li>\n          <li>Search</li>\n          <li>Git</li>\n          <li>Extensions</li>\n        </ul>\n      </nav>\n    </aside>\n  );\n}\n`,
  '/project/docs/CHANGELOG.md': `# Changelog\n\n## [1.0.0] - 2024-01-01\n\n### Added\n- Initial release\n- File tree navigation\n- Syntax highlighting\n- Markdown preview\n\n### Fixed\n- Various performance improvements\n`,
};

export function useFileSystem() {
  const addProjectRoot = useAppStore(s => s.addProjectRoot);
  const openTab = useAppStore(s => s.openTab);

  const loadDirectory = useCallback(async (dirPath: string) => {
    if (isTauri) {
      try {
        const tree = await tauriInvoke<FileEntry[]>('list_directory', { path: dirPath });
        addProjectRoot(dirPath, tree);
      } catch (e) {
        console.error('Failed to list directory:', e);
      }
    } else {
      addProjectRoot('/project', mockFileTree);
    }
  }, [addProjectRoot]);

  const readFile = useCallback(async (filePath: string): Promise<string> => {
    if (isTauri) {
      try {
        return await tauriInvoke<string>('read_file', { path: filePath });
      } catch (e) {
        console.error('Failed to read file:', e);
        return '';
      }
    }
    return mockFileContents[filePath] || `// Content of ${filePath}\n`;
  }, []);

  const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    if (isTauri) {
      try {
        await tauriInvoke('write_file', { path: filePath, content });
        return true;
      } catch (e) {
        console.error('Failed to write file:', e);
        return false;
      }
    }
    mockFileContents[filePath] = content;
    return true;
  }, []);

  const openFileInEditor = useCallback(async (path: string, name: string) => {
    if (!isEditableFile(name)) return;
    const content = await readFile(path);
    openTab(path, name, content);
  }, [readFile, openTab]);

  const openFolder = useCallback(async () => {
    if (isTauri) {
      try {
        const selected = await tauriInvoke<string | null>('open_folder_dialog');
        if (selected) {
          await loadDirectory(selected);
        }
      } catch (e) {
        console.error('Failed to open folder dialog:', e);
      }
    } else {
      await loadDirectory('/project');
    }
  }, [loadDirectory]);

  const createFile = useCallback(async (dirPath: string, name: string): Promise<boolean> => {
    if (isTauri) {
      try {
        await tauriInvoke('create_file', { path: `${dirPath}/${name}` });
        return true;
      } catch (e) {
        console.error('Failed to create file:', e);
        return false;
      }
    }
    return true;
  }, []);

  const createDirectory = useCallback(async (dirPath: string, name: string): Promise<boolean> => {
    if (isTauri) {
      try {
        await tauriInvoke('create_directory', { path: `${dirPath}/${name}` });
        return true;
      } catch (e) {
        console.error('Failed to create directory:', e);
        return false;
      }
    }
    return true;
  }, []);

  const deleteEntry = useCallback(async (path: string): Promise<boolean> => {
    if (isTauri) {
      try {
        await tauriInvoke('delete_file', { path });
        return true;
      } catch (e) {
        console.error('Failed to delete:', e);
        return false;
      }
    }
    return true;
  }, []);

  const renameEntry = useCallback(async (oldPath: string, newPath: string): Promise<boolean> => {
    if (isTauri) {
      try {
        await tauriInvoke('rename_file', { oldPath, newPath });
        return true;
      } catch (e) {
        console.error('Failed to rename:', e);
        return false;
      }
    }
    return true;
  }, []);

  return {
    loadDirectory,
    readFile,
    writeFile,
    openFileInEditor,
    openFolder,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
  };
}
