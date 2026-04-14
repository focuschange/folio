import { create } from 'zustand';
import type { EditorTab, AppSettings, FileEntry, GitStatusEntry, GitLogEntry } from '../types';
import { defaultSettings } from '../types';
import { getLanguageFromPath } from '../utils/languages';

interface AppState {
  // Tabs
  tabs: EditorTab[];
  activeTabId: string | null;

  // File tree
  fileTree: FileEntry[];
  projectRoot: string | null;
  expandedDirs: Set<string>;
  selectedPath: string | null;

  // Open/Recent files
  openFiles: string[];
  recentFiles: string[];

  // UI visibility
  sidebarVisible: boolean;
  rightPanelVisible: boolean;
  gitPanelVisible: boolean;
  terminalVisible: boolean;
  outlineVisible: boolean;
  zenMode: boolean;
  searchVisible: boolean;
  settingsVisible: boolean;

  // Git
  gitBranch: string;
  gitStatus: GitStatusEntry[];
  gitLog: GitLogEntry[];

  // Settings
  settings: AppSettings;

  // Actions - Tabs
  openTab: (path: string, name: string, content: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  markTabClean: (id: string) => void;
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  updateTabCursor: (id: string, line: number, column: number) => void;

  // Actions - File tree
  setFileTree: (tree: FileEntry[]) => void;
  setProjectRoot: (root: string | null) => void;
  toggleDir: (path: string) => void;
  setSelectedPath: (path: string | null) => void;

  // Actions - UI
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  toggleGitPanel: () => void;
  toggleTerminal: () => void;
  toggleOutline: () => void;
  toggleZenMode: () => void;
  toggleSearch: () => void;
  toggleSettings: () => void;
  setSearchVisible: (v: boolean) => void;
  setSettingsVisible: (v: boolean) => void;

  // Actions - Git
  setGitBranch: (branch: string) => void;
  setGitStatus: (status: GitStatusEntry[]) => void;
  setGitLog: (log: GitLogEntry[]) => void;

  // Actions - Settings
  updateSettings: (partial: Partial<AppSettings>) => void;
  setSettings: (settings: AppSettings) => void;

  // Actions - Recent files
  addRecentFile: (path: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  tabs: [],
  activeTabId: null,
  fileTree: [],
  projectRoot: null,
  expandedDirs: new Set<string>(),
  selectedPath: null,
  openFiles: [],
  recentFiles: [],
  sidebarVisible: true,
  rightPanelVisible: false,
  gitPanelVisible: false,
  terminalVisible: false,
  outlineVisible: false,
  zenMode: false,
  searchVisible: false,
  settingsVisible: false,
  gitBranch: '',
  gitStatus: [],
  gitLog: [],
  settings: defaultSettings,

  // Tab actions
  openTab: (path, name, content) => {
    const state = get();
    const existing = state.tabs.find(t => t.path === path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const language = getLanguageFromPath(path);
    const tab: EditorTab = {
      id, path, name, content, language, dirty: false, pinned: false,
      encoding: 'UTF-8', cursorLine: 1, cursorColumn: 1,
    };
    set({
      tabs: [...state.tabs, tab],
      activeTabId: id,
      openFiles: state.openFiles.includes(path)
        ? state.openFiles
        : [...state.openFiles, path],
    });
    get().addRecentFile(path);
  },

  closeTab: (id) => {
    const state = get();
    const tab = state.tabs.find(t => t.id === id);
    if (!tab || tab.pinned) return;
    const idx = state.tabs.findIndex(t => t.id === id);
    const newTabs = state.tabs.filter(t => t.id !== id);
    let newActiveId = state.activeTabId;
    if (state.activeTabId === id) {
      if (newTabs.length === 0) newActiveId = null;
      else if (idx >= newTabs.length) newActiveId = newTabs[newTabs.length - 1].id;
      else newActiveId = newTabs[idx].id;
    }
    set({
      tabs: newTabs,
      activeTabId: newActiveId,
      openFiles: state.openFiles.filter(p => p !== tab.path),
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) =>
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === id ? { ...t, content, dirty: true } : t
      ),
    })),

  markTabClean: (id) =>
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === id ? { ...t, dirty: false } : t
      ),
    })),

  pinTab: (id) =>
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === id ? { ...t, pinned: true } : t
      ),
    })),

  unpinTab: (id) =>
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === id ? { ...t, pinned: false } : t
      ),
    })),

  reorderTabs: (fromIndex, toIndex) =>
    set(state => {
      const newTabs = [...state.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return { tabs: newTabs };
    }),

  closeOtherTabs: (id) =>
    set(state => ({
      tabs: state.tabs.filter(t => t.id === id || t.pinned),
      activeTabId: id,
    })),

  closeAllTabs: () => set({ tabs: [], activeTabId: null, openFiles: [] }),

  updateTabCursor: (id, line, column) =>
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === id ? { ...t, cursorLine: line, cursorColumn: column } : t
      ),
    })),

  // File tree actions
  setFileTree: (tree) => set({ fileTree: tree }),
  setProjectRoot: (root) => set({ projectRoot: root }),

  toggleDir: (path) =>
    set(state => {
      const next = new Set(state.expandedDirs);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { expandedDirs: next };
    }),

  setSelectedPath: (path) => set({ selectedPath: path }),

  // UI toggles
  toggleSidebar: () => set(state => ({ sidebarVisible: !state.sidebarVisible })),
  toggleRightPanel: () => set(state => ({ rightPanelVisible: !state.rightPanelVisible })),
  toggleGitPanel: () => set(state => ({ gitPanelVisible: !state.gitPanelVisible })),
  toggleTerminal: () => set(state => ({ terminalVisible: !state.terminalVisible })),
  toggleOutline: () => set(state => ({ outlineVisible: !state.outlineVisible })),
  toggleZenMode: () =>
    set(state => ({
      zenMode: !state.zenMode,
      sidebarVisible: state.zenMode ? true : false,
      rightPanelVisible: false,
      terminalVisible: false,
      gitPanelVisible: false,
    })),
  toggleSearch: () => set(state => ({ searchVisible: !state.searchVisible })),
  toggleSettings: () => set(state => ({ settingsVisible: !state.settingsVisible })),
  setSearchVisible: (v) => set({ searchVisible: v }),
  setSettingsVisible: (v) => set({ settingsVisible: v }),

  // Git actions
  setGitBranch: (branch) => set({ gitBranch: branch }),
  setGitStatus: (status) => set({ gitStatus: status }),
  setGitLog: (log) => set({ gitLog: log }),

  // Settings
  updateSettings: (partial) =>
    set(state => ({ settings: { ...state.settings, ...partial } })),
  setSettings: (settings) => set({ settings }),

  // Recent files
  addRecentFile: (path) =>
    set(state => {
      const filtered = state.recentFiles.filter(p => p !== path);
      return { recentFiles: [path, ...filtered].slice(0, 20) };
    }),
}));
