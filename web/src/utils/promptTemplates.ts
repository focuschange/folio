// Slash-command prompt templates for the AI chat panel.
// User types `/name arguments…` — the matching template's systemPrompt is sent
// as `systemOverride` to streamAiChat, and the remaining text becomes the user
// message (with `{input}` in userTemplate substituted).

export interface PromptTemplate {
  /** Command name without the leading slash, lowercase. */
  name: string;
  /** One-line description shown in the dropdown. */
  description: string;
  /** System prompt sent to the model (wins over default context-based system). */
  systemPrompt: string;
  /**
   * Optional user-message template. `{input}` is replaced with the text after
   * the command. If omitted, the user text is sent as-is.
   */
  userTemplate?: string;
  /** Whether this template benefits from the current-file context. Default true. */
  useFileContext?: boolean;
}

export const BUILTIN_TEMPLATES: PromptTemplate[] = [
  {
    name: 'explain',
    description: '코드가 무엇을 하는지 설명',
    systemPrompt:
      'You are a code explainer. Read the user-provided code (or the current file context) and explain what it does. ' +
      'Structure: 1) One-sentence summary. 2) Key functions/components. 3) Notable patterns or gotchas. ' +
      'Be concise, technical, in the same language the user writes in.',
    userTemplate: 'Explain: {input}',
  },
  {
    name: 'refactor',
    description: '가독성/유지보수성 개선 제안',
    systemPrompt:
      'You are a senior engineer performing a refactor review. Propose concrete refactoring changes for the user-provided code. ' +
      'Prioritize: readability, single-responsibility, removing duplication, clearer naming. ' +
      'Output: 1) Summary of issues, 2) Refactored code in a fenced block, 3) What changed and why.',
    userTemplate: 'Refactor this code: {input}',
  },
  {
    name: 'test',
    description: '단위 테스트 생성',
    systemPrompt:
      'You are a test-writing assistant. Generate unit tests for the user-provided code. ' +
      "Detect the language from the code, pick an idiomatic testing framework (Vitest/Jest for JS/TS, pytest for Python, cargo test for Rust, JUnit for Java). " +
      'Cover: happy path, edge cases, error cases. Output a single fenced code block of tests.',
    userTemplate: 'Write unit tests for: {input}',
  },
  {
    name: 'doc',
    description: '문서 주석 (JSDoc/docstring) 생성',
    systemPrompt:
      'You are a documentation generator. Produce doc comments (JSDoc for JS/TS, docstrings for Python, /// for Rust, /** */ for Java) ' +
      'describing the public API of the user-provided code. Include parameter types, return values, thrown errors, and a one-line summary. ' +
      'Return the documented code in a single fenced code block.',
    userTemplate: 'Add documentation comments to: {input}',
  },
  {
    name: 'fix',
    description: '버그/이슈 수정 제안',
    systemPrompt:
      'You are a debugging assistant. Find bugs, issues, or suspicious patterns in the user-provided code and propose fixes. ' +
      'Output: 1) List each issue with file/line context, 2) Fixed code in a fenced block, 3) Explanation of what was wrong.',
    userTemplate: 'Fix bugs in this code: {input}',
  },
];

/** Parse leading `/commandName rest…` — returns match + remainder, or null. */
export function parseSlashCommand(input: string): { template: PromptTemplate; rest: string } | null {
  const m = /^\/([a-z][a-z0-9_-]*)\s*(.*)$/is.exec(input);
  if (!m) return null;
  const [, name, rest] = m;
  const template = BUILTIN_TEMPLATES.find(t => t.name === name.toLowerCase());
  if (!template) return null;
  return { template, rest: rest.trimStart() };
}

/** Find templates whose name starts with the prefix (for dropdown filtering). */
export function matchTemplatePrefix(prefix: string): PromptTemplate[] {
  const p = prefix.toLowerCase();
  return BUILTIN_TEMPLATES.filter(t => t.name.startsWith(p));
}

/** Expand the user message using the template's userTemplate. */
export function expandUserMessage(template: PromptTemplate, rest: string): string {
  if (!template.userTemplate) return rest;
  return template.userTemplate.replace('{input}', rest);
}
