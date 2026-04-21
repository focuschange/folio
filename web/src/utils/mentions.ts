// @mention parsing + resolution for the AI chat panel.
// Syntax (plain text, inline in the input):
//   @file:<path>     — specific file content
//   @folder:<path>   — folder (lists child paths by name)
//   @tabs            — all currently open tabs (content)
//   @git-diff        — staged + unstaged diff
//   @git-staged      — staged diff only
//
// Token budgets:
//   PER_FILE_CAP   = 32000 chars
//   TOTAL_CAP      = 256000 chars
// Overflow is truncated with a `[...truncated...]` marker.

import type { EditorTab, FileEntry } from '../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export const PER_FILE_CAP = 32_000;
export const TOTAL_CAP = 256_000;

export type MentionKind =
  | 'file'
  | 'folder'
  | 'tabs'
  | 'git-diff'
  | 'git-staged';

export interface Mention {
  kind: MentionKind;
  /** Target path/arg. Empty for @tabs / @git-diff / @git-staged. */
  target: string;
  /** The raw matched string, including the leading `@`. */
  raw: string;
  /** Offset in the source text where `@` starts. */
  start: number;
  /** Offset just past the last character of the mention. */
  end: number;
}

/**
 * Regex for mention tokens. Ordered so longer names win (`git-staged` before
 * `git-diff`, both before `git`) via alternation precedence. Argument is
 * captured lazily up to whitespace or end-of-string.
 *
 * Matches: @file:foo.ts  @folder:src  @tabs  @git-diff  @git-staged
 */
const MENTION_RE = /@(?:(file|folder):([^\s]+)|(tabs|git-staged|git-diff))\b/g;

/** Scan text for mention tokens. Pure, side-effect free. */
export function parseMentions(text: string): Mention[] {
  const mentions: Mention[] = [];
  MENTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(text)) !== null) {
    const [raw, arg1, arg2, bare] = m;
    const kind: MentionKind = (arg1 ?? bare) as MentionKind;
    const target = arg2 ?? '';
    mentions.push({
      kind,
      target,
      raw,
      start: m.index,
      end: m.index + raw.length,
    });
  }
  return mentions;
}

/** True if `ch` is a valid body character for a mention (after `@kind:`). */
export function isMentionBodyChar(ch: string): boolean {
  return !!ch && !/\s/.test(ch);
}

// --------------------------------------------------------------------------
// Autocomplete suggestions — what the dropdown shows based on the token the
// user is currently typing. Pure & synchronous (uses store data passed in).
// --------------------------------------------------------------------------

export interface AutocompleteEntry {
  label: string;
  /** What to insert (including `@` prefix). */
  insertText: string;
  /** Short description shown in dropdown. */
  hint?: string;
}

const CATEGORY_ENTRIES: AutocompleteEntry[] = [
  { label: '@file:',      insertText: '@file:',      hint: '파일 내용 포함' },
  { label: '@folder:',    insertText: '@folder:',    hint: '폴더 하위 파일 목록' },
  { label: '@tabs',       insertText: '@tabs',       hint: '열린 모든 탭' },
  { label: '@git-diff',   insertText: '@git-diff',   hint: 'staged + unstaged diff' },
  { label: '@git-staged', insertText: '@git-staged', hint: 'staged diff only' },
];

function flattenFileTree(tree: FileEntry[], acc: FileEntry[] = []): FileEntry[] {
  for (const e of tree) {
    acc.push(e);
    if (e.isDir && e.children) flattenFileTree(e.children, acc);
  }
  return acc;
}

/**
 * Decide what to show in the autocomplete dropdown. Returns null if the cursor
 * is not inside a mention-prefix region.
 */
export function autocompleteFor(params: {
  text: string;
  cursor: number;
  tabs: EditorTab[];
  recentFiles: string[];
  fileTree: FileEntry[];
}): { kind: 'category' | 'arg'; token: { start: number; end: number }; entries: AutocompleteEntry[] } | null {
  const { text, cursor, tabs, recentFiles, fileTree } = params;
  // Find the nearest `@` before cursor without whitespace between
  let i = cursor - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === '@') break;
    if (/\s/.test(ch)) return null;
    i--;
  }
  if (i < 0) return null;
  // Token extends from `@` to next whitespace after cursor
  let end = cursor;
  while (end < text.length && !/\s/.test(text[end])) end++;
  const token = text.slice(i, end);

  // Category stage: just "@" or "@partial"
  if (!token.includes(':')) {
    const prefix = token.slice(1).toLowerCase();
    const entries = CATEGORY_ENTRIES.filter(e =>
      e.insertText.slice(1).toLowerCase().startsWith(prefix)
    );
    return entries.length > 0
      ? { kind: 'category', token: { start: i, end }, entries }
      : null;
  }

  // Arg stage: `@file:xxx` or `@folder:yyy`
  const [headRaw, argRaw] = token.split(':');
  const head = headRaw.slice(1).toLowerCase();
  const arg = (argRaw ?? '').toLowerCase();

  if (head === 'file') {
    // Candidates: open tabs → recent files → all files in tree
    const flat = flattenFileTree(fileTree).filter(e => !e.isDir);
    const tabPaths = new Set(tabs.map(t => t.path));
    const candidates = [
      ...tabs.map(t => t.path),
      ...recentFiles.filter(p => !tabPaths.has(p)),
      ...flat.map(e => e.path).filter(p => !tabPaths.has(p) && !recentFiles.includes(p)),
    ];
    const matched = arg
      ? candidates.filter(p => p.toLowerCase().includes(arg))
      : candidates;
    const entries: AutocompleteEntry[] = matched.slice(0, 20).map(p => ({
      label: shortPath(p),
      insertText: `@file:${p}`,
      hint: tabPaths.has(p) ? 'open tab' : undefined,
    }));
    return entries.length > 0
      ? { kind: 'arg', token: { start: i, end }, entries }
      : null;
  }

  if (head === 'folder') {
    const flat = flattenFileTree(fileTree).filter(e => e.isDir);
    const matched = arg
      ? flat.filter(e => e.path.toLowerCase().includes(arg))
      : flat;
    const entries: AutocompleteEntry[] = matched.slice(0, 20).map(e => ({
      label: shortPath(e.path),
      insertText: `@folder:${e.path}`,
    }));
    return entries.length > 0
      ? { kind: 'arg', token: { start: i, end }, entries }
      : null;
  }

  return null;
}

/** Last two segments of a path, for display. */
function shortPath(p: string): string {
  const parts = p.split('/').filter(Boolean);
  if (parts.length <= 2) return p;
  return '…/' + parts.slice(-2).join('/');
}

// --------------------------------------------------------------------------
// Resolution — turn mentions into a concatenated context block for the AI
// --------------------------------------------------------------------------

function truncate(text: string, cap: number): string {
  if (text.length <= cap) return text;
  return text.slice(0, cap) + `\n[...truncated ${text.length - cap} chars...]`;
}

function langFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return ext;
}

export interface ResolveParams {
  tabs: EditorTab[];
  projectRoot: string | null;
}

/**
 * Resolve all mentions in `text` and build a single context block string.
 * Respects PER_FILE_CAP and TOTAL_CAP. Missing files or git errors are
 * reported inline with [Error: ...] markers instead of failing the whole send.
 */
export async function resolveMentions(
  text: string,
  params: ResolveParams,
): Promise<{ contextBlock: string; resolved: number }> {
  const mentions = parseMentions(text);
  if (mentions.length === 0) return { contextBlock: '', resolved: 0 };

  const parts: string[] = [];
  let total = 0;
  const remaining = () => Math.max(0, TOTAL_CAP - total);

  const push = (header: string, body: string, lang = '') => {
    const cap = Math.min(PER_FILE_CAP, remaining());
    if (cap <= 0) return;
    const fence = lang ? '```' + lang : '```';
    const trimmed = truncate(body, cap);
    const chunk = `### ${header}\n${fence}\n${trimmed}\n\`\`\`\n`;
    parts.push(chunk);
    total += chunk.length;
  };

  for (const m of mentions) {
    if (remaining() === 0) {
      parts.push(`### [...total cap ${TOTAL_CAP} reached, further mentions skipped...]\n`);
      break;
    }

    try {
      switch (m.kind) {
        case 'file': {
          const openTab = params.tabs.find(t => t.path === m.target);
          let content: string;
          if (openTab) {
            content = openTab.content;
          } else if (isTauri) {
            content = await tauriInvoke<string>('read_file', { path: m.target });
          } else {
            content = '[File read requires Tauri desktop app]';
          }
          push(`@file: ${m.target}`, content, langFromPath(m.target));
          break;
        }
        case 'folder': {
          // Emit list of child paths from the file tree (names only — no content)
          // Note: resolver doesn't have fileTree; caller could pass a fs listing
          // via Tauri. For MVP we ask the backend to list the directory.
          if (isTauri) {
            const entries = await tauriInvoke<FileEntry[]>('list_directory', { path: m.target });
            const lines = entries.map(e => (e.isDir ? `📁 ${e.name}/` : `📄 ${e.name}`));
            push(`@folder: ${m.target}`, lines.join('\n'));
          } else {
            push(`@folder: ${m.target}`, '[Folder listing requires Tauri desktop app]');
          }
          break;
        }
        case 'tabs': {
          const budget = Math.min(PER_FILE_CAP, remaining());
          const perTab = Math.max(500, Math.floor(budget / Math.max(1, params.tabs.length)));
          const body = params.tabs.map(t => {
            const lang = langFromPath(t.path);
            const fence = lang ? '```' + lang : '```';
            return `--- ${t.path} ---\n${fence}\n${truncate(t.content, perTab)}\n\`\`\``;
          }).join('\n\n');
          push(`@tabs (${params.tabs.length} files)`, body);
          break;
        }
        case 'git-diff': {
          if (!params.projectRoot) {
            push(`@git-diff`, '[Error: project root not set]');
            break;
          }
          if (!isTauri) {
            push(`@git-diff`, '[git access requires Tauri desktop app]');
            break;
          }
          const [staged, unstaged] = await Promise.all([
            tauriInvoke<string>('git_diff_staged_raw', { path: params.projectRoot }).catch(e => `[Error: ${e}]`),
            tauriInvoke<string>('git_diff_unstaged_raw', { path: params.projectRoot }).catch(e => `[Error: ${e}]`),
          ]);
          const combined = [
            staged.trim() ? `# STAGED\n${staged}` : '',
            unstaged.trim() ? `# UNSTAGED\n${unstaged}` : '',
          ].filter(Boolean).join('\n\n');
          push(`@git-diff`, combined || '(no changes)', 'diff');
          break;
        }
        case 'git-staged': {
          if (!params.projectRoot) {
            push(`@git-staged`, '[Error: project root not set]');
            break;
          }
          if (!isTauri) {
            push(`@git-staged`, '[git access requires Tauri desktop app]');
            break;
          }
          const staged = await tauriInvoke<string>('git_diff_staged_raw', { path: params.projectRoot })
            .catch(e => `[Error: ${e}]`);
          push(`@git-staged`, staged || '(no staged changes)', 'diff');
          break;
        }
      }
    } catch (e) {
      push(`${m.raw}`, `[Error: ${e instanceof Error ? e.message : String(e)}]`);
    }
  }

  const contextBlock = parts.length > 0
    ? `<mentions>\n${parts.join('\n')}</mentions>\n\n`
    : '';
  return { contextBlock, resolved: mentions.length };
}
