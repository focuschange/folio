// Markdown editing actions for Monaco editor
// Each function operates on the editor instance directly

import type { editor as MonacoEditor } from 'monaco-editor';

type Editor = MonacoEditor.IStandaloneCodeEditor;

/** Wrap selected text with `before` and `after` markers. */
export function wrapSelection(editor: Editor, before: string, after: string): void {
  const selection = editor.getSelection();
  if (!selection) return;
  const model = editor.getModel();
  if (!model) return;
  const selectedText = model.getValueInRange(selection);
  editor.executeEdits('md-wrap', [{
    range: selection,
    text: `${before}${selectedText}${after}`,
  }]);
  editor.focus();
}

/** Add a prefix to each line of the selection (or current line if no selection). */
export function prefixLines(editor: Editor, prefix: string): void {
  const selection = editor.getSelection();
  const model = editor.getModel();
  if (!selection || !model) return;
  const startLine = selection.startLineNumber;
  const endLine = selection.endLineNumber;
  const edits: MonacoEditor.IIdentifiedSingleEditOperation[] = [];
  for (let line = startLine; line <= endLine; line++) {
    edits.push({
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      text: prefix,
    });
  }
  editor.executeEdits('md-prefix', edits);
  editor.focus();
}

/** Set the heading level of the current line. level 0 = paragraph (remove heading) */
export function setHeading(editor: Editor, level: number): void {
  const position = editor.getPosition();
  const model = editor.getModel();
  if (!position || !model) return;
  const line = position.lineNumber;
  const lineContent = model.getLineContent(line);
  // Remove existing heading markers
  const stripped = lineContent.replace(/^#{1,6}\s+/, '');
  const newContent = level === 0 ? stripped : `${'#'.repeat(level)} ${stripped}`;
  editor.executeEdits('md-heading', [{
    range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: lineContent.length + 1 },
    text: newContent,
  }]);
  editor.focus();
}

/** Insert text at the current cursor position. */
export function insertAtCursor(editor: Editor, text: string): void {
  const position = editor.getPosition();
  if (!position) return;
  editor.executeEdits('md-insert', [{
    range: {
      startLineNumber: position.lineNumber, startColumn: position.column,
      endLineNumber: position.lineNumber, endColumn: position.column,
    },
    text,
  }]);
  editor.focus();
}

/** Insert a code block. If selection exists, wrap it. */
export function insertCodeBlock(editor: Editor, language = ''): void {
  const selection = editor.getSelection();
  const model = editor.getModel();
  if (!selection || !model) return;
  const selectedText = model.getValueInRange(selection);
  const text = selectedText
    ? `\`\`\`${language}\n${selectedText}\n\`\`\``
    : `\`\`\`${language}\n\n\`\`\``;
  editor.executeEdits('md-codeblock', [{ range: selection, text }]);
  editor.focus();
}

export function insertLink(editor: Editor): void {
  const selection = editor.getSelection();
  const model = editor.getModel();
  if (!selection || !model) return;
  const selectedText = model.getValueInRange(selection);
  const text = selectedText
    ? `[${selectedText}](url)`
    : `[link text](url)`;
  editor.executeEdits('md-link', [{ range: selection, text }]);
  editor.focus();
}

export function insertImage(editor: Editor): void {
  const selection = editor.getSelection();
  const model = editor.getModel();
  if (!selection || !model) return;
  const selectedText = model.getValueInRange(selection);
  const text = selectedText
    ? `![${selectedText}](image-url)`
    : `![alt text](image-url)`;
  editor.executeEdits('md-image', [{ range: selection, text }]);
  editor.focus();
}

export function insertHorizontalRule(editor: Editor): void {
  insertAtCursor(editor, '\n\n---\n\n');
}

export function insertMathBlock(editor: Editor): void {
  const selection = editor.getSelection();
  const model = editor.getModel();
  if (!selection || !model) return;
  const selectedText = model.getValueInRange(selection);
  const text = selectedText
    ? `$$\n${selectedText}\n$$`
    : `$$\n\n$$`;
  editor.executeEdits('md-math', [{ range: selection, text }]);
  editor.focus();
}

export function insertMermaid(editor: Editor): void {
  insertAtCursor(editor,
    '\n```mermaid\ngraph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action 1]\n  B -->|No| D[Action 2]\n```\n');
}

export function insertFootnote(editor: Editor): void {
  const model = editor.getModel();
  if (!model) return;
  // Find next available footnote number
  const content = model.getValue();
  const existing = [...content.matchAll(/\[\^(\d+)\]/g)].map(m => parseInt(m[1], 10));
  const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;

  // Insert reference at cursor
  insertAtCursor(editor, `[^${nextNum}]`);

  // Insert definition at end of file
  const lastLine = model.getLineCount();
  const lastLineLen = model.getLineLength(lastLine);
  editor.executeEdits('md-footnote-def', [{
    range: {
      startLineNumber: lastLine, startColumn: lastLineLen + 1,
      endLineNumber: lastLine, endColumn: lastLineLen + 1,
    },
    text: `\n\n[^${nextNum}]: footnote text`,
  }]);
}

export function insertTable(editor: Editor): void {
  insertAtCursor(editor,
    '\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n');
}

export function insertTOC(editor: Editor): void {
  const model = editor.getModel();
  if (!model) return;
  const content = model.getValue();
  const headings = content.match(/^#{1,6}\s+.+$/gm) ?? [];
  const toc = headings.map(h => {
    const level = h.match(/^(#+)/)?.[1].length ?? 1;
    const text = h.replace(/^#+\s+/, '');
    const slug = text.toLowerCase().replace(/[^\w]+/g, '-');
    return `${'  '.repeat(level - 1)}- [${text}](#${slug})`;
  }).join('\n');
  insertAtCursor(editor, `\n## Table of Contents\n\n${toc}\n\n`);
}

export function indent(editor: Editor): void {
  prefixLines(editor, '  ');
}

export function outdent(editor: Editor): void {
  const selection = editor.getSelection();
  const model = editor.getModel();
  if (!selection || !model) return;
  const startLine = selection.startLineNumber;
  const endLine = selection.endLineNumber;
  const edits: MonacoEditor.IIdentifiedSingleEditOperation[] = [];
  for (let line = startLine; line <= endLine; line++) {
    const content = model.getLineContent(line);
    if (content.startsWith('  ')) {
      edits.push({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 3 },
        text: '',
      });
    } else if (content.startsWith('\t')) {
      edits.push({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 2 },
        text: '',
      });
    }
  }
  if (edits.length > 0) {
    editor.executeEdits('md-outdent', edits);
  }
  editor.focus();
}
