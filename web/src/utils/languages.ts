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

  // Scripting / Config
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
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
