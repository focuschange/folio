// Ghost Text (#94) — Copilot-style inline completions.
//
// Uses Monaco's built-in InlineCompletionsProvider API so we get the native
// ghost-text rendering, Tab-to-accept and Esc-to-dismiss for free.
//
// Design notes:
// - Single global registration (pattern: '**') at app boot. Reuses the same
//   provider across all editors/tabs so we don't double-register per tab.
// - Cost-conscious defaults: `ghost_enabled` gate in AiConfig, opt-in only.
// - Latency-sensitive: 350ms debounce in-provider, uses the short non-stream
//   Rust command `ai_ghost_text` with max_tokens=128.
// - Cancellation: each invocation bumps `latestReq`; Monaco also passes a
//   CancellationToken. We honor both to discard stale responses.
// - Config cache: 5s TTL to avoid a Tauri round-trip on every keystroke.
//   Invalidate explicitly after Settings save via `invalidateGhostTextConfig`.

import * as monaco from 'monaco-editor';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

interface CachedConfig {
  provider: string;
  apiKey: string;
  ghostEnabled: boolean;
  ghostModel?: string;
}

let cachedConfig: CachedConfig | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5_000;

/** Flush the in-memory config cache. Call after Settings save. */
export function invalidateGhostTextConfig(): void {
  cachedConfig = null;
  cacheTime = 0;
}

async function getConfig(): Promise<CachedConfig | null> {
  if (!isTauri) return null;
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL_MS) return cachedConfig;
  try {
    const json = await tauriInvoke<string>('load_ai_config');
    const raw = JSON.parse(json) as Record<string, unknown>;
    cachedConfig = {
      provider: (raw.provider as string) || 'claude',
      apiKey: raw.has_api_key ? '(configured)' : '',
      ghostEnabled: !!raw.ghost_enabled,
      ghostModel: (raw.ghost_model as string) || undefined,
    };
    cacheTime = now;
    return cachedConfig;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// Context window limits — keep the request payload small for latency.
// --------------------------------------------------------------------------
const PREFIX_MAX = 2000;
const SUFFIX_MAX = 500;
const DEBOUNCE_MS = 350;

/** Extract up to PREFIX_MAX chars of text ending at `position`. */
function extractPrefix(model: monaco.editor.ITextModel, position: monaco.Position): string {
  const range = new monaco.Range(1, 1, position.lineNumber, position.column);
  const full = model.getValueInRange(range);
  return full.length > PREFIX_MAX ? full.slice(full.length - PREFIX_MAX) : full;
}

/** Extract up to SUFFIX_MAX chars of text starting at `position`. */
function extractSuffix(model: monaco.editor.ITextModel, position: monaco.Position): string {
  const last = model.getLineCount();
  const lastCol = model.getLineMaxColumn(last);
  const range = new monaco.Range(position.lineNumber, position.column, last, lastCol);
  const full = model.getValueInRange(range);
  return full.length > SUFFIX_MAX ? full.slice(0, SUFFIX_MAX) : full;
}

/**
 * Post-process the model response:
 * - Strip leading/trailing ``` fences the model sometimes emits despite instruction.
 * - If the completion starts with text that already appears immediately after
 *   the cursor (`suffix` prefix match), drop that overlap. This prevents double
 *   insertion when the model echoes surrounding code.
 */
function cleanCompletion(raw: string, suffix: string): string {
  let text = raw;
  // Strip a single wrapping fence like ```ts\n...\n``` or ```\n...\n```
  const fenceMatch = text.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) text = fenceMatch[1];
  // Drop leading fence-only lines
  text = text.replace(/^```[a-zA-Z0-9_-]*\s*\n/, '').replace(/\n```\s*$/, '');

  // If the model echoed what's already after the cursor, trim that overlap.
  if (suffix && text.length > 0) {
    const maxOverlap = Math.min(text.length, suffix.length, 80);
    for (let len = maxOverlap; len > 0; len--) {
      const tail = text.slice(text.length - len);
      if (suffix.startsWith(tail)) {
        text = text.slice(0, text.length - len);
        break;
      }
    }
  }
  return text;
}

// --------------------------------------------------------------------------
// Provider registration — single-shot at app boot.
// --------------------------------------------------------------------------

let latestReq = 0;
let registered = false;

/**
 * Register the global Ghost Text provider. Safe to call multiple times —
 * subsequent calls are no-ops. Returns a disposable for teardown.
 */
export function registerGhostText(): monaco.IDisposable | null {
  if (registered) return null;
  registered = true;

  const provider: monaco.languages.InlineCompletionsProvider = {
    async provideInlineCompletions(model, position, _context, token) {
      const myReq = ++latestReq;

      // Debounce — skip if user kept typing or Monaco cancelled.
      await new Promise(r => setTimeout(r, DEBOUNCE_MS));
      if (token.isCancellationRequested || myReq !== latestReq) return { items: [] };

      const config = await getConfig();
      if (!config || !config.ghostEnabled || !config.apiKey) return { items: [] };

      const prefix = extractPrefix(model, position);
      const suffix = extractSuffix(model, position);

      // Heuristic: don't fire on an empty line with no leading context
      // (first keystroke of a fresh file) — almost always a bad suggestion.
      if (prefix.trim().length < 2) return { items: [] };

      const language = model.getLanguageId() || 'plaintext';

      let response: string;
      try {
        response = await tauriInvoke<string>('ai_ghost_text', {
          prefix, suffix, language,
        });
      } catch {
        return { items: [] };
      }
      if (token.isCancellationRequested || myReq !== latestReq) return { items: [] };

      const completion = cleanCompletion(response, suffix);
      if (!completion) return { items: [] };

      const range = new monaco.Range(
        position.lineNumber, position.column,
        position.lineNumber, position.column,
      );
      return {
        items: [
          {
            insertText: completion,
            range,
          },
        ],
      };
    },
    disposeInlineCompletions() {
      // No per-item resources to free.
    },
  };

  // Register globally — matches any URI, so it works across all languages
  // including lazily-registered ones (groovy, etc).
  return monaco.languages.registerInlineCompletionsProvider(
    { pattern: '**' },
    provider,
  );
}
