export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileEntry[];
  size?: number;
  modified?: string;
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
};
