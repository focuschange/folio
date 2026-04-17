const extensionToLanguage: Record<string, string> = {
  // Web
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  jsonc: 'json',
  xml: 'xml',
  svg: 'xml',
  vue: 'html',
  svelte: 'html',

  // Programming
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  py: 'python',
  pyi: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  swift: 'swift',
  m: 'objective-c',
  php: 'php',
  r: 'r',
  scala: 'scala',
  dart: 'dart',
  lua: 'lua',
  pl: 'perl',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  hs: 'haskell',
  clj: 'clojure',
  groovy: 'groovy',
  gvy: 'groovy',
  gy: 'groovy',
  gradle: 'groovy',

  // Scripting / Config
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ksh: 'shell',
  ash: 'shell',
  command: 'shell',
  ps1: 'powershell',
  bat: 'bat',
  cmd: 'bat',

  // Data / Config
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  conf: 'ini',
  cfg: 'ini',
  env: 'ini',
  properties: 'ini',

  // Markup / Docs
  md: 'markdown',
  mdx: 'markdown',
  markdown: 'markdown',
  tex: 'latex',
  rst: 'restructuredtext',
  adoc: 'plaintext',

  // Database
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',

  // Docker / CI
  dockerfile: 'dockerfile',

  // Other
  diff: 'diff',
  patch: 'diff',
  log: 'plaintext',
  txt: 'plaintext',
  csv: 'plaintext',
  tsv: 'plaintext',
};

const filenameToLanguage: Record<string, string> = {
  Dockerfile: 'dockerfile',
  Makefile: 'makefile',
  CMakeLists: 'cmake',
  Vagrantfile: 'ruby',
  Gemfile: 'ruby',
  Rakefile: 'ruby',
  Podfile: 'ruby',
  '.gitignore': 'ini',
  '.gitattributes': 'ini',
  '.editorconfig': 'ini',
  '.prettierrc': 'json',
  '.eslintrc': 'json',
  '.babelrc': 'json',
  'tsconfig.json': 'json',
  'package.json': 'json',
  // Shell / Bash config files
  '.bashrc': 'shell',
  '.bash_profile': 'shell',
  '.bash_logout': 'shell',
  '.bash_aliases': 'shell',
  '.zshrc': 'shell',
  '.zprofile': 'shell',
  '.zshenv': 'shell',
  '.profile': 'shell',
  '.inputrc': 'shell',
  // Groovy / Gradle
  'build.gradle': 'groovy',
  'settings.gradle': 'groovy',
  'Jenkinsfile': 'groovy',
};

export function getLanguageFromPath(filePath: string): string {
  const name = filePath.split('/').pop() || filePath.split('\\').pop() || '';

  if (filenameToLanguage[name]) return filenameToLanguage[name];

  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';
  return extensionToLanguage[ext] || 'plaintext';
}

export function isMarkdown(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return ext === 'md' || ext === 'mdx' || ext === 'markdown';
}

export function isHtml(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return ext === 'html' || ext === 'htm';
}

// Common Monaco languages, organized by group, for language selector menu
export interface LanguageOption {
  value: string;
  label: string;
  group: 'common' | 'web' | 'programming' | 'data' | 'shell' | 'other';
}

export const ALL_LANGUAGES: LanguageOption[] = [
  // Common
  { value: 'plaintext', label: 'Plain Text', group: 'common' },
  { value: 'markdown', label: 'Markdown', group: 'common' },
  // Web
  { value: 'javascript', label: 'JavaScript', group: 'web' },
  { value: 'typescript', label: 'TypeScript', group: 'web' },
  { value: 'html', label: 'HTML', group: 'web' },
  { value: 'css', label: 'CSS', group: 'web' },
  { value: 'scss', label: 'SCSS', group: 'web' },
  { value: 'less', label: 'Less', group: 'web' },
  { value: 'json', label: 'JSON', group: 'web' },
  { value: 'xml', label: 'XML', group: 'web' },
  { value: 'graphql', label: 'GraphQL', group: 'web' },
  // Programming
  { value: 'java', label: 'Java', group: 'programming' },
  { value: 'kotlin', label: 'Kotlin', group: 'programming' },
  { value: 'python', label: 'Python', group: 'programming' },
  { value: 'ruby', label: 'Ruby', group: 'programming' },
  { value: 'go', label: 'Go', group: 'programming' },
  { value: 'rust', label: 'Rust', group: 'programming' },
  { value: 'c', label: 'C', group: 'programming' },
  { value: 'cpp', label: 'C++', group: 'programming' },
  { value: 'csharp', label: 'C#', group: 'programming' },
  { value: 'swift', label: 'Swift', group: 'programming' },
  { value: 'objective-c', label: 'Objective-C', group: 'programming' },
  { value: 'php', label: 'PHP', group: 'programming' },
  { value: 'r', label: 'R', group: 'programming' },
  { value: 'scala', label: 'Scala', group: 'programming' },
  { value: 'dart', label: 'Dart', group: 'programming' },
  { value: 'lua', label: 'Lua', group: 'programming' },
  { value: 'perl', label: 'Perl', group: 'programming' },
  { value: 'elixir', label: 'Elixir', group: 'programming' },
  { value: 'haskell', label: 'Haskell', group: 'programming' },
  { value: 'clojure', label: 'Clojure', group: 'programming' },
  { value: 'groovy', label: 'Groovy', group: 'programming' },
  // Data / Config
  { value: 'yaml', label: 'YAML', group: 'data' },
  { value: 'ini', label: 'INI / TOML', group: 'data' },
  { value: 'sql', label: 'SQL', group: 'data' },
  // Shell
  { value: 'shell', label: 'Shell / Bash', group: 'shell' },
  { value: 'bash', label: 'Bash', group: 'shell' },
  { value: 'powershell', label: 'PowerShell', group: 'shell' },
  { value: 'bat', label: 'Batch', group: 'shell' },
  { value: 'dockerfile', label: 'Dockerfile', group: 'shell' },
  // Other
  { value: 'latex', label: 'LaTeX', group: 'other' },
  { value: 'diff', label: 'Diff', group: 'other' },
];

export function getAllLanguages(): LanguageOption[] {
  return ALL_LANGUAGES;
}
