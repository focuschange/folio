export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileEntry[];
  size?: number;
  modified?: string;
  /** True for dot-files/directories and build artifact directories (node_modules, target, etc.) */
  isHidden?: boolean;
}

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  dirty: boolean;
  pinned: boolean;
  encoding: string;
  cursorLine?: number;
  cursorColumn?: number;
  scrollTop?: number;
  /** True when the underlying file no longer exists on disk. Set by the periodic sync. */
  missing?: boolean;
}

export interface GitStatusEntry {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked' | 'renamed' | 'copied';
  staged: boolean;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface GitLogEntry {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export type RightTab = 'outline' | 'files' | 'git' | 'info' | 'todos' | 'toc' | 'links' | 'recent' | 'bookmarks' | 'images' | 'chat' | 'snippets' | 'tasks' | 'docs' | 'ssh' | 'tunnel' | 'jekyll';

export type SplitDirection = 'none' | 'horizontal' | 'vertical';

export interface SshConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  keyPath?: string;
}

export interface SshTunnel {
  id: string;
  connectionId: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  active: boolean;
}

export interface TaskDef {
  name: string;
  command: string;
  source: string;  // 'package.json' | 'Makefile' | 'build.gradle.kts'
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AiConfig {
  provider: string;
  apiKey: string;
  model: string;
  /** Ghost Text #94 — Copilot-style inline completions (opt-in per cost). */
  ghostEnabled?: boolean;
  /** Fast model for ghost text (e.g. claude-haiku-4, gpt-4o-mini). Fallback = `model`. */
  ghostModel?: string;
}

export interface TodoItem {
  type: 'TODO' | 'FIXME' | 'HACK';
  path: string;
  lineNumber: number;
  lineContent: string;
}

export interface LinkInfo {
  text: string;
  url: string;
  lineNumber: number;
  kind: 'markdown' | 'html' | 'raw';
}

export interface ImageInfo {
  alt: string;
  url: string;
  lineNumber: number;
  kind: 'markdown' | 'html';
}

export interface OutlineSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'heading' | 'variable' | 'method' | 'enum';
  line: number;
  children?: OutlineSymbol[];
}

export interface SearchResult {
  path: string;
  lineNumber: number;
  lineContent: string;
  matchStart?: number;
  matchEnd?: number;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  autoSave: boolean;
  autoSaveInterval: number;
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  renderWhitespace: 'none' | 'boundary' | 'all';
  bracketPairColorization: boolean;
  smoothScrolling: boolean;
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorStyle: 'line' | 'block' | 'underline';
  editorPadding: number;
  /** When in markdown split-preview mode, sync scroll between editor and preview. Default true. */
  scrollSync: boolean;
  /** Show hidden files/directories (starting with '.') in the file tree. Default false. */
  showHiddenFiles: boolean;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  created: string;
  isReadOnly: boolean;
  encoding: string;
  lineEnding: 'LF' | 'CRLF';
}

export interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SessionState {
  tabs: Array<{
    id: string;
    path: string;
    name: string;
    content: string;
    language: string;
    dirty: boolean;
    pinned: boolean;
    encoding: string;
    cursorLine?: number;
    cursorColumn?: number;
  }>;
  activeTabId: string | null;
  projectRoots: string[];
  sidebarVisible: boolean;
  rightPanelVisible: boolean;
  gitPanelVisible: boolean;
  terminalVisible: boolean;
  outlineVisible: boolean;
  activeRightTab: RightTab;
  expandedDirs: string[];
  sidebarWidth: number;
  rightWidth: number;
  terminalHeight: number;
  bookmarks?: Record<string, number[]>;
  previewVisible?: boolean;
}

export const defaultSettings: AppSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
  tabSize: 4,
  wordWrap: 'off',
  autoSave: true,
  autoSaveInterval: 1000,
  minimap: true,
  lineNumbers: 'on',
  renderWhitespace: 'none',
  bracketPairColorization: true,
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorStyle: 'line',
  editorPadding: 16,
  scrollSync: true,
  showHiddenFiles: false,
};
