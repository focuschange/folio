// Quick Actions (⌘.) — preset instructions that drive startInlineEdit.
// Each action becomes a menu entry. `autoSubmit` sends immediately without
// the user retyping the prompt; leave it false for actions that benefit from
// a custom prompt on top of the preset (none do today, but kept for flexibility).

export interface QuickAction {
  id: string;
  label: string;
  /** Short description shown below the label. */
  hint: string;
  /** Preset instruction sent to the AI edit system prompt. */
  preset: string;
  /** Single-letter accelerator shown in the menu and bindable to keys 1–9. */
  accelerator?: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'fix',
    label: 'Fix',
    hint: '버그·이슈 수정',
    preset: 'Find and fix any bugs, logic errors, or issues in this code. Return only the corrected code, preserving the original structure as much as possible.',
    accelerator: '1',
  },
  {
    id: 'refactor',
    label: 'Refactor',
    hint: '가독성·유지보수성 개선',
    preset: 'Refactor this code for better readability, maintainability, and clarity. Keep behavior identical. Prefer smaller functions, clearer names, and removal of duplication.',
    accelerator: '2',
  },
  {
    id: 'explain',
    label: 'Explain',
    hint: '주석으로 설명 추가',
    preset: 'Add concise inline or block comments explaining what this code does. Do not change any behavior — only add comments. Use the dominant language/comment style of the file.',
    accelerator: '3',
  },
  {
    id: 'types',
    label: 'Add Types',
    hint: 'TypeScript/타입 주석 추가',
    preset: 'Add or improve type annotations (TypeScript types, Python type hints, Rust types, Java generics, etc., based on language). Preserve all behavior. Return only the typed code.',
    accelerator: '4',
  },
  {
    id: 'tests',
    label: 'Write Tests',
    hint: '단위 테스트 생성',
    preset: 'Write unit tests for this code. Pick an idiomatic framework for the language (Vitest/Jest for JS/TS, pytest for Python, cargo test for Rust, JUnit for Java). Cover happy path and edge cases. Return ONLY the test code.',
    accelerator: '5',
  },
];
