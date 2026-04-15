import {
  File, FileText, FileCode, FileJson, FileImage,
  FolderOpen, Folder, Terminal, Database, Globe, Settings,
  FileSpreadsheet, Package, Lock, Key, Shield, Braces,
  Coffee, Gem, Bug, Cpu, Box, Palette, Music,
  Film, Archive, BookOpen, Scroll, FileWarning, Cog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface IconInfo {
  icon: LucideIcon;
  color: string;
}

const extensionIcons: Record<string, IconInfo> = {
  // JavaScript / TypeScript
  js: { icon: FileCode, color: '#f7df1e' },
  jsx: { icon: FileCode, color: '#61dafb' },
  ts: { icon: FileCode, color: '#3178c6' },
  tsx: { icon: FileCode, color: '#3178c6' },
  mjs: { icon: FileCode, color: '#f7df1e' },
  cjs: { icon: FileCode, color: '#f7df1e' },

  // Web
  html: { icon: Globe, color: '#e34f26' },
  htm: { icon: Globe, color: '#e34f26' },
  css: { icon: Palette, color: '#1572b6' },
  scss: { icon: Palette, color: '#cd6799' },
  less: { icon: Palette, color: '#1d365d' },
  vue: { icon: FileCode, color: '#42b883' },
  svelte: { icon: FileCode, color: '#ff3e00' },

  // Data
  json: { icon: FileJson, color: '#a8b0b8' },
  jsonc: { icon: FileJson, color: '#a8b0b8' },
  yaml: { icon: FileText, color: '#cb171e' },
  yml: { icon: FileText, color: '#cb171e' },
  xml: { icon: FileCode, color: '#e37933' },
  svg: { icon: FileImage, color: '#ffb13b' },
  toml: { icon: Settings, color: '#9c4121' },

  // Programming Languages
  java: { icon: Coffee, color: '#f89820' },
  kt: { icon: FileCode, color: '#7f52ff' },
  kts: { icon: FileCode, color: '#7f52ff' },
  py: { icon: FileCode, color: '#3776ab' },
  pyi: { icon: FileCode, color: '#3776ab' },
  rb: { icon: Gem, color: '#cc342d' },
  go: { icon: FileCode, color: '#00add8' },
  rs: { icon: Cog, color: '#dea584' },
  c: { icon: FileCode, color: '#555555' },
  h: { icon: FileCode, color: '#555555' },
  cpp: { icon: FileCode, color: '#f34b7d' },
  cc: { icon: FileCode, color: '#f34b7d' },
  cs: { icon: FileCode, color: '#178600' },
  swift: { icon: FileCode, color: '#f05138' },
  php: { icon: FileCode, color: '#777bb4' },
  r: { icon: FileCode, color: '#276dc3' },
  scala: { icon: FileCode, color: '#dc322f' },
  dart: { icon: FileCode, color: '#00b4ab' },
  lua: { icon: FileCode, color: '#000080' },
  ex: { icon: FileCode, color: '#6e4a7e' },
  exs: { icon: FileCode, color: '#6e4a7e' },
  hs: { icon: FileCode, color: '#5e5086' },
  clj: { icon: FileCode, color: '#63b132' },
  groovy: { icon: FileCode, color: '#4298b8' },

  // Shell
  sh: { icon: Terminal, color: '#89e051' },
  bash: { icon: Terminal, color: '#89e051' },
  zsh: { icon: Terminal, color: '#89e051' },
  fish: { icon: Terminal, color: '#89e051' },
  ps1: { icon: Terminal, color: '#012456' },
  bat: { icon: Terminal, color: '#c1f12e' },
  cmd: { icon: Terminal, color: '#c1f12e' },

  // Markup / Docs
  md: { icon: BookOpen, color: '#519aba' },
  mdx: { icon: BookOpen, color: '#519aba' },
  markdown: { icon: BookOpen, color: '#519aba' },
  tex: { icon: Scroll, color: '#3d6117' },
  rst: { icon: FileText, color: '#141414' },
  txt: { icon: FileText, color: '#a8b0b8' },

  // Config
  ini: { icon: Settings, color: '#a8b0b8' },
  conf: { icon: Settings, color: '#a8b0b8' },
  cfg: { icon: Settings, color: '#a8b0b8' },
  env: { icon: Lock, color: '#ecd53f' },
  properties: { icon: Settings, color: '#a8b0b8' },

  // Database
  sql: { icon: Database, color: '#e38c00' },
  graphql: { icon: Braces, color: '#e535ab' },
  gql: { icon: Braces, color: '#e535ab' },

  // Docker / CI
  dockerfile: { icon: Box, color: '#2496ed' },

  // Build / Package
  gradle: { icon: Package, color: '#02303a' },
  maven: { icon: Package, color: '#c71a36' },

  // Media
  png: { icon: FileImage, color: '#a074c4' },
  jpg: { icon: FileImage, color: '#a074c4' },
  jpeg: { icon: FileImage, color: '#a074c4' },
  gif: { icon: FileImage, color: '#a074c4' },
  webp: { icon: FileImage, color: '#a074c4' },
  ico: { icon: FileImage, color: '#a074c4' },
  mp3: { icon: Music, color: '#e91e63' },
  wav: { icon: Music, color: '#e91e63' },
  mp4: { icon: Film, color: '#f44336' },
  avi: { icon: Film, color: '#f44336' },

  // Archives
  zip: { icon: Archive, color: '#e7a639' },
  tar: { icon: Archive, color: '#e7a639' },
  gz: { icon: Archive, color: '#e7a639' },
  rar: { icon: Archive, color: '#e7a639' },

  // Misc
  csv: { icon: FileSpreadsheet, color: '#217346' },
  tsv: { icon: FileSpreadsheet, color: '#217346' },
  log: { icon: FileText, color: '#a8b0b8' },
  diff: { icon: FileWarning, color: '#f44336' },
  patch: { icon: FileWarning, color: '#f44336' },
  lock: { icon: Lock, color: '#a8b0b8' },
  key: { icon: Key, color: '#f44336' },
  pem: { icon: Shield, color: '#f44336' },
  cert: { icon: Shield, color: '#f44336' },
};

const filenameIcons: Record<string, IconInfo> = {
  Dockerfile: { icon: Box, color: '#2496ed' },
  Makefile: { icon: Cpu, color: '#427819' },
  Rakefile: { icon: Gem, color: '#cc342d' },
  Gemfile: { icon: Gem, color: '#cc342d' },
  '.gitignore': { icon: FileText, color: '#f05032' },
  '.gitattributes': { icon: FileText, color: '#f05032' },
  '.editorconfig': { icon: Settings, color: '#a8b0b8' },
  '.prettierrc': { icon: Settings, color: '#a8b0b8' },
  '.eslintrc': { icon: Bug, color: '#4b32c3' },
  'package.json': { icon: Package, color: '#cb3837' },
  'tsconfig.json': { icon: FileJson, color: '#3178c6' },
  'vite.config.ts': { icon: Settings, color: '#646cff' },
  'webpack.config.js': { icon: Settings, color: '#8dd6f9' },
  'tailwind.config.js': { icon: Settings, color: '#06b6d4' },
  'tailwind.config.ts': { icon: Settings, color: '#06b6d4' },
  LICENSE: { icon: FileText, color: '#f0c040' },
  README: { icon: BookOpen, color: '#519aba' },
  'README.md': { icon: BookOpen, color: '#519aba' },
  'Cargo.toml': { icon: Package, color: '#dea584' },
  'go.mod': { icon: Package, color: '#00add8' },
  'go.sum': { icon: Lock, color: '#00add8' },
  'pom.xml': { icon: Package, color: '#c71a36' },
  'build.gradle': { icon: Package, color: '#02303a' },
  'build.gradle.kts': { icon: Package, color: '#02303a' },
  'settings.gradle': { icon: Settings, color: '#02303a' },
  'settings.gradle.kts': { icon: Settings, color: '#02303a' },
  'docker-compose.yml': { icon: Box, color: '#2496ed' },
  'docker-compose.yaml': { icon: Box, color: '#2496ed' },
};

const NON_EDITABLE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg', 'tiff', 'tif',
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma',
  'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm',
  'zip', 'tar', 'gz', 'bz2', 'rar', '7z', 'xz',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'exe', 'dll', 'so', 'dylib', 'bin', 'dat', 'class', 'o', 'a',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'sqlite', 'db',
]);

export function isEditableFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return !NON_EDITABLE_EXTENSIONS.has(ext);
}

const defaultIcon: IconInfo = { icon: File, color: '#a8b0b8' };

export function getFileIconInfo(fileName: string): IconInfo {
  if (filenameIcons[fileName]) return filenameIcons[fileName];
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';
  return extensionIcons[ext] || defaultIcon;
}

export function getFolderIcon(isOpen: boolean) {
  return {
    icon: isOpen ? FolderOpen : Folder,
    color: '#a8b0b8',
  };
}

export function FileIcon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const { icon: Icon, color } = getFileIconInfo(name);
  return <Icon size={size} style={{ color, flexShrink: 0 }} className={className} />;
}

export function FolderIcon({ isOpen, size = 16, className = '' }: { isOpen: boolean; size?: number; className?: string }) {
  const { icon: Icon, color } = getFolderIcon(isOpen);
  return <Icon size={size} style={{ color, flexShrink: 0 }} className={className} />;
}

