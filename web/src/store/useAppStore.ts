import { create } from 'zustand';
import type { EditorTab, AppSettings, FileEntry, GitStatusEntry, GitLogEntry, SessionState, RightTab, TodoItem, LinkInfo, ChatMessage, SplitDirection } from '../types';
import { defaultSettings } from '../types';
import { getLanguageFromPath } from '../utils/languages';

interface AppState {
  // Tabs
  tabs: EditorTab[];
  activeTabId: string | null;

  // File tree
  fileTree: FileEntry[];
  projectRoot: string | null;
  projectRoots: string[];
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
  activeRightTab: RightTab;
  zenMode: boolean;
  searchVisible: boolean;
  settingsVisible: boolean;

  // Panel sizes
  sidebarWidth: number;
  rightWidth: number;
  terminalHeight: number;

  // Git
  gitBranch: string;
  gitStatus: GitStatusEntry[];
  gitLog: GitLogEntry[];

  // Right panel data
  todoItems: TodoItem[];
  fileLinks: LinkInfo[];
  bookmarks: Record<string, number[]>;  // filePath → line numbers

  // Editor split
  splitDirection: SplitDirection;
  splitTabId: string | null;

  // Markdown preview visibility (markdown files only)
  previewVisible: boolean;

  // AI Chat
  chatMessages: ChatMessage[];
  chatLoading: boolean;

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
  setTabEncoding: (id: string, encoding: string) => void;
  setTabLanguage: (id: string, language: string) => void;
  updateTabPath: (id: string, newPath: string, newName?: string) => void;
  setTabMissing: (id: string, missing: boolean) => void;

  // Actions - File tree
  setFileTree: (tree: FileEntry[]) => void;
  setProjectRoot: (root: string | null) => void;
  toggleDir: (path: string) => void;
  setSelectedPath: (path: string | null) => void;
  collapseAllDirs: () => void;
  expandAllDirs: () => void;
  expandToPath: (path: string) => void;
  addProjectRoot: (path: string, tree: FileEntry[]) => void;
  removeProjectRoot: (path: string) => void;

  // Actions - UI
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  toggleGitPanel: () => void;
  toggleTerminal: () => void;
  toggleOutline: () => void;
  toggleZenMode: () => void;
  toggleSearch: () => void;
  toggleSettings: () => void;
  setActiveRightTab: (tab: RightTab) => void;
  showRightPanelTab: (tab: RightTab) => void;
  setSearchVisible: (v: boolean) => void;
  setSettingsVisible: (v: boolean) => void;

  // Actions - Git
  setGitBranch: (branch: string) => void;
  setGitStatus: (status: GitStatusEntry[]) => void;
  setGitLog: (log: GitLogEntry[]) => void;
  setTodoItems: (items: TodoItem[]) => void;
  setFileLinks: (links: LinkInfo[]) => void;
  clearRecentFiles: () => void;
  toggleBookmark: (path: string, line: number) => void;
  clearBookmarksForFile: (path: string) => void;
  removeBookmark: (path: string, line: number) => void;
  reorderProjectRoots: (fromIndex: number, toIndex: number) => void;
  togglePreview: () => void;
  setPreviewVisible: (v: boolean) => void;
  toggleSplit: (direction: SplitDirection) => void;
  setSplitTab: (tabId: string | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChatMessages: () => void;
  setChatLoading: (v: boolean) => void;
  appendToLastAssistantMessage: (text: string) => void;
  setLastAssistantMessage: (content: string) => void;

  // Actions - Settings
  updateSettings: (partial: Partial<AppSettings>) => void;
  setSettings: (settings: AppSettings) => void;

  // Actions - Panel sizes
  setSidebarWidth: (w: number) => void;
  setRightWidth: (w: number) => void;
  setTerminalHeight: (h: number) => void;
  resizeSidebar: (delta: number) => void;
  resizeRightPanel: (delta: number) => void;

  // Actions - Session
  restoreSession: (session: SessionState) => void;
  getSessionState: () => SessionState;

  // Actions - Recent files
  addRecentFile: (path: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  tabs: [],
  activeTabId: null,
  fileTree: [],
  projectRoot: null,
  projectRoots: [],
  expandedDirs: new Set<string>(),
  selectedPath: null,
  openFiles: [],
  recentFiles: [],
  sidebarVisible: true,
  rightPanelVisible: false,
  gitPanelVisible: false,
  terminalVisible: false,
  outlineVisible: false,
  activeRightTab: 'files' as RightTab,
  zenMode: false,
  searchVisible: false,
  settingsVisible: false,
  sidebarWidth: 260,
  rightWidth: 200,
  terminalHeight: 200,
  gitBranch: '',
  gitStatus: [],
  gitLog: [],
  todoItems: [],
  fileLinks: [],
  bookmarks: {},
  splitDirection: 'none' as SplitDirection,
  splitTabId: null,
  previewVisible: true,
  chatMessages: [],
  chatLoading: false,
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

  setTabEncoding: (id, encoding) =>
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === id ? { ...t, encoding } : t
      ),
    })),

  setTabLanguage: (id, language) =>
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === id ? { ...t, language } : t
      ),
    })),

  setTabMissing: (id, missing) =>
    set(state => ({
      tabs: state.tabs.map(t => (t.id === id ? { ...t, missing } : t)),
    })),

  updateTabPath: (id, newPath, newName) =>
    set(state => ({
      tabs: state.tabs.map(t => {
        if (t.id !== id) return t;
        const name = newName ?? newPath.split('/').pop() ?? t.name;
        const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
        const langMap: Record<string, string> = {
          js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
          json: 'json', md: 'markdown', html: 'html', css: 'css', scss: 'scss',
          py: 'python', java: 'java', go: 'go', rs: 'rust', sql: 'sql',
          yaml: 'yaml', yml: 'yaml', sh: 'shell', toml: 'toml',
        };
        const language = (ext && langMap[ext]) || t.language;
        return { ...t, path: newPath, name, language };
      }),
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

  collapseAllDirs: () => set({ expandedDirs: new Set<string>() }),

  // Expand all ancestor directories of `path` so the file becomes visible in the tree.
  expandToPath: (path) =>
    set(state => {
      // Add every ancestor dir up to (but not including) the file itself.
      // We iterate by splitting on '/', since the tree paths are absolute filesystem paths.
      const next = new Set(state.expandedDirs);
      const segments = path.split('/').filter(Boolean);
      let acc = path.startsWith('/') ? '' : '';
      for (let i = 0; i < segments.length - 1; i++) {
        acc = acc + '/' + segments[i];
        next.add(acc);
      }
      return { expandedDirs: next };
    }),

  expandAllDirs: () => {
    const state = get();
    const dirs = new Set<string>();
    const collectDirs = (entries: FileEntry[]) => {
      for (const e of entries) {
        if (e.isDir) {
          dirs.add(e.path);
          if (e.children) collectDirs(e.children);
        }
      }
    };
    collectDirs(state.fileTree);
    set({ expandedDirs: dirs });
  },

  addProjectRoot: (path, tree) => {
    const state = get();
    const lastSegment = path.split('/').pop() || path;
    const rootEntry: FileEntry = { name: lastSegment, path, isDir: true, children: tree };

    const existsInTree = state.fileTree.some(e => e.path === path);
    const existsInRoots = state.projectRoots.includes(path);

    if (existsInTree) {
      // This is a refresh of an existing root (e.g. periodic disk sync). Replace the
      // tree entry but DO NOT touch expandedDirs — user may have collapsed the root
      // and we shouldn't keep auto-expanding it on every sync.
      const newFileTree = state.fileTree.map(e => e.path === path ? rootEntry : e);
      set({ fileTree: newFileTree });
    } else {
      // First-time add: auto-expand the new root.
      const newExpanded = new Set(state.expandedDirs);
      newExpanded.add(path);
      set({
        projectRoots: existsInRoots ? state.projectRoots : [...state.projectRoots, path],
        fileTree: [...state.fileTree, rootEntry],
        projectRoot: path,
        expandedDirs: newExpanded,
      });
    }
  },

  removeProjectRoot: (path) => {
    const state = get();
    const newRoots = state.projectRoots.filter(r => r !== path);
    const newTree = state.fileTree.filter(e => e.path !== path);
    set({
      projectRoots: newRoots,
      fileTree: newTree,
      projectRoot: newTree.length === 0 ? null : state.projectRoot === path ? (newRoots[0] ?? null) : state.projectRoot,
    });
  },

  // UI toggles
  toggleSidebar: () => set(state => ({ sidebarVisible: !state.sidebarVisible })),
  toggleRightPanel: () => set(state => ({ rightPanelVisible: !state.rightPanelVisible })),
  toggleGitPanel: () => set(state => {
    if (state.activeRightTab === 'git' && state.rightPanelVisible) {
      return { rightPanelVisible: false, gitPanelVisible: false };
    }
    return { activeRightTab: 'git' as RightTab, rightPanelVisible: true, gitPanelVisible: true, outlineVisible: false };
  }),
  toggleTerminal: () => set(state => ({ terminalVisible: !state.terminalVisible })),
  toggleOutline: () => set(state => {
    if (state.activeRightTab === 'outline' && state.rightPanelVisible) {
      return { rightPanelVisible: false, outlineVisible: false };
    }
    return { activeRightTab: 'outline' as RightTab, rightPanelVisible: true, outlineVisible: true, gitPanelVisible: false };
  }),
  toggleZenMode: () =>
    set(state => ({
      zenMode: !state.zenMode,
      sidebarVisible: state.zenMode ? true : false,
      rightPanelVisible: false,
      terminalVisible: false,
      gitPanelVisible: false,
    })),
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),
  showRightPanelTab: (tab) => set({ activeRightTab: tab, rightPanelVisible: true }),
  toggleSearch: () => set(state => ({ searchVisible: !state.searchVisible })),
  toggleSettings: () => set(state => ({ settingsVisible: !state.settingsVisible })),
  setSearchVisible: (v) => set({ searchVisible: v }),
  setSettingsVisible: (v) => set({ settingsVisible: v }),

  // Git actions
  setGitBranch: (branch) => set({ gitBranch: branch }),
  setGitStatus: (status) => set({ gitStatus: status }),
  setGitLog: (log) => set({ gitLog: log }),
  setTodoItems: (items) => set({ todoItems: items }),
  setFileLinks: (links) => set({ fileLinks: links }),
  clearRecentFiles: () => set({ recentFiles: [] }),

  toggleBookmark: (path, line) =>
    set(state => {
      const current = state.bookmarks[path] ?? [];
      const next = current.includes(line)
        ? current.filter(l => l !== line)
        : [...current, line].sort((a, b) => a - b);
      const newBookmarks = { ...state.bookmarks };
      if (next.length === 0) delete newBookmarks[path];
      else newBookmarks[path] = next;
      return { bookmarks: newBookmarks };
    }),

  removeBookmark: (path, line) =>
    set(state => {
      const current = state.bookmarks[path] ?? [];
      const next = current.filter(l => l !== line);
      const newBookmarks = { ...state.bookmarks };
      if (next.length === 0) delete newBookmarks[path];
      else newBookmarks[path] = next;
      return { bookmarks: newBookmarks };
    }),

  clearBookmarksForFile: (path) =>
    set(state => {
      const newBookmarks = { ...state.bookmarks };
      delete newBookmarks[path];
      return { bookmarks: newBookmarks };
    }),

  togglePreview: () => set(state => ({ previewVisible: !state.previewVisible })),
  setPreviewVisible: (v) => set({ previewVisible: v }),

  toggleSplit: (direction) => set(state => {
    if (state.splitDirection === direction) {
      return { splitDirection: 'none' as SplitDirection, splitTabId: null };
    }
    // Default split tab: pick another open tab or same tab
    const splitTabId = state.splitTabId ?? state.activeTabId;
    return { splitDirection: direction, splitTabId };
  }),
  setSplitTab: (tabId) => set({ splitTabId: tabId }),

  addChatMessage: (msg) => set(state => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChatMessages: () => set({ chatMessages: [] }),
  setChatLoading: (v) => set({ chatLoading: v }),
  appendToLastAssistantMessage: (text) => set(state => {
    const list = state.chatMessages;
    if (list.length === 0 || list[list.length - 1].role !== 'assistant') return state;
    const last = list[list.length - 1];
    const next = [...list.slice(0, -1), { ...last, content: last.content + text }];
    return { chatMessages: next };
  }),
  setLastAssistantMessage: (content) => set(state => {
    const list = state.chatMessages;
    if (list.length === 0 || list[list.length - 1].role !== 'assistant') return state;
    const last = list[list.length - 1];
    const next = [...list.slice(0, -1), { ...last, content }];
    return { chatMessages: next };
  }),

  reorderProjectRoots: (fromIndex, toIndex) =>
    set(state => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return {};
      if (fromIndex >= state.projectRoots.length || toIndex >= state.projectRoots.length) return {};
      const newRoots = [...state.projectRoots];
      const [movedRoot] = newRoots.splice(fromIndex, 1);
      newRoots.splice(toIndex, 0, movedRoot);
      // Reorder fileTree to match
      const newTree = newRoots
        .map(path => state.fileTree.find(e => e.path === path))
        .filter((e): e is FileEntry => e !== undefined);
      // Include any tree entries whose path isn't in projectRoots (edge case)
      state.fileTree.forEach(e => {
        if (!newTree.find(n => n.path === e.path)) newTree.push(e);
      });
      return { projectRoots: newRoots, fileTree: newTree };
    }),

  // Settings
  updateSettings: (partial) =>
    set(state => ({ settings: { ...state.settings, ...partial } })),
  setSettings: (settings) => set({ settings }),

  // Panel sizes
  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setRightWidth: (w) => set({ rightWidth: w }),
  setTerminalHeight: (h) => set({ terminalHeight: h }),

  resizeSidebar: (delta) => set(state => {
    const next = Math.max(50, Math.min(600, state.sidebarWidth + delta));
    return {
      sidebarWidth: next,
      // If hidden, auto-show the sidebar when the user asks to resize it
      sidebarVisible: state.sidebarVisible || delta > 0,
    };
  }),

  resizeRightPanel: (delta) => set(state => {
    const next = Math.max(50, Math.min(500, state.rightWidth + delta));
    return {
      rightWidth: next,
      rightPanelVisible: state.rightPanelVisible || delta > 0,
    };
  }),

  // Session
  restoreSession: (session) => set({
    tabs: session.tabs ?? [],
    activeTabId: session.activeTabId ?? null,
    // Start projectRoots empty — they'll be re-populated by addProjectRoot() in
    // useSession.ts only for paths that actually exist on disk. This keeps
    // projectRoots in sync with fileTree (preventing index mismatch in reorder).
    projectRoots: [],
    sidebarVisible: session.sidebarVisible ?? true,
    rightPanelVisible: session.rightPanelVisible ?? false,
    gitPanelVisible: session.gitPanelVisible ?? false,
    terminalVisible: session.terminalVisible ?? false,
    outlineVisible: session.outlineVisible ?? false,
    activeRightTab: session.activeRightTab ?? 'files' as RightTab,
    expandedDirs: new Set(session.expandedDirs ?? []),
    sidebarWidth: session.sidebarWidth ?? 260,
    rightWidth: session.rightWidth ?? 200,
    terminalHeight: session.terminalHeight ?? 200,
    bookmarks: session.bookmarks ?? {},
    previewVisible: session.previewVisible ?? true,
  }),

  getSessionState: () => {
    const s = get();
    const SENSITIVE_PATTERNS = [
      /\.env(\.|$)/i,
      /\.(pem|key|p12|pfx|cert|crt)$/i,
      /id_(rsa|ed25519|ecdsa|dsa)(\.pub)?$/i,
      /ai-config\.json$/i,
      /ssh-connections\.json$/i,
    ];
    const isSensitivePath = (path: string) =>
      SENSITIVE_PATTERNS.some(re => re.test(path));
    return {
      tabs: s.tabs.map(t => ({
        id: t.id,
        path: t.path,
        name: t.name,
        content: isSensitivePath(t.path) ? '' : t.content,
        language: t.language,
        dirty: t.dirty,
        pinned: t.pinned,
        encoding: t.encoding,
        cursorLine: t.cursorLine,
        cursorColumn: t.cursorColumn,
      })),
      activeTabId: s.activeTabId,
      projectRoots: s.projectRoots,
      sidebarVisible: s.sidebarVisible,
      rightPanelVisible: s.rightPanelVisible,
      gitPanelVisible: s.gitPanelVisible,
      terminalVisible: s.terminalVisible,
      outlineVisible: s.outlineVisible,
      activeRightTab: s.activeRightTab,
      expandedDirs: Array.from(s.expandedDirs),
      sidebarWidth: s.sidebarWidth,
      rightWidth: s.rightWidth,
      terminalHeight: s.terminalHeight,
      bookmarks: s.bookmarks,
      previewVisible: s.previewVisible,
    };
  },

  // Recent files
  addRecentFile: (path) =>
    set(state => {
      const filtered = state.recentFiles.filter(p => p !== path);
      return { recentFiles: [path, ...filtered].slice(0, 20) };
    }),
}));
