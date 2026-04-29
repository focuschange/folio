/**
 * HTML editing actions for Monaco editor.
 * Each function wraps the current selection (or inserts at cursor) with HTML tags.
 */
import type { editor as Monaco } from 'monaco-editor';

type Ed = Monaco.IStandaloneCodeEditor;

/** Wrap selected text with open/close tags. If no selection, insert placeholder. */
export function wrapTag(editor: Ed, tag: string, attrs = '', placeholder = 'text') {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;

  const selected = model.getValueInRange(sel);
  const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  const close = `</${tag}>`;
  const inner = selected || placeholder;
  const result = `${open}${inner}${close}`;

  editor.executeEdits('html-toolbar', [{ range: sel, text: result }]);
  editor.focus();
}

/** Insert block-level tag on its own line. */
export function insertBlock(editor: Ed, tag: string, attrs = '', placeholder = '') {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;

  const selected = model.getValueInRange(sel);
  const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  const close = `</${tag}>`;
  const inner = selected || placeholder || tag.toUpperCase();
  const result = `\n${open}${inner}${close}\n`;

  editor.executeEdits('html-toolbar', [{ range: sel, text: result }]);
  editor.focus();
}

export function bold(editor: Ed) { wrapTag(editor, 'strong'); }
export function italic(editor: Ed) { wrapTag(editor, 'em'); }
export function underline(editor: Ed) { wrapTag(editor, 'u'); }
export function strikethrough(editor: Ed) { wrapTag(editor, 's'); }
export function inlineCode(editor: Ed) { wrapTag(editor, 'code'); }
export function mark(editor: Ed) { wrapTag(editor, 'mark'); }
export function small(editor: Ed) { wrapTag(editor, 'small'); }
export function superscript(editor: Ed) { wrapTag(editor, 'sup'); }
export function subscript(editor: Ed) { wrapTag(editor, 'sub'); }

export function heading(editor: Ed, level: 1 | 2 | 3 | 4 | 5 | 6) {
  insertBlock(editor, `h${level}`, '', `Heading ${level}`);
}

export function paragraph(editor: Ed) { insertBlock(editor, 'p', '', 'Paragraph text'); }
export function blockquote(editor: Ed) { insertBlock(editor, 'blockquote', '', 'Blockquote text'); }

export function unorderedList(editor: Ed) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;
  const selected = model.getValueInRange(sel).trim();
  const items = selected
    ? selected.split('\n').map(l => `  <li>${l.trim()}</li>`).join('\n')
    : '  <li>Item 1</li>\n  <li>Item 2</li>\n  <li>Item 3</li>';
  editor.executeEdits('html-toolbar', [{ range: sel, text: `\n<ul>\n${items}\n</ul>\n` }]);
  editor.focus();
}

export function orderedList(editor: Ed) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;
  const selected = model.getValueInRange(sel).trim();
  const items = selected
    ? selected.split('\n').map(l => `  <li>${l.trim()}</li>`).join('\n')
    : '  <li>Item 1</li>\n  <li>Item 2</li>\n  <li>Item 3</li>';
  editor.executeEdits('html-toolbar', [{ range: sel, text: `\n<ol>\n${items}\n</ol>\n` }]);
  editor.focus();
}

export function insertLink(editor: Ed, url = 'https://') {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;
  const selected = model.getValueInRange(sel) || 'Link text';
  editor.executeEdits('html-toolbar', [{ range: sel, text: `<a href="${url}">${selected}</a>` }]);
  editor.focus();
}

export function insertImage(editor: Ed, src = '', alt = 'image') {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;
  editor.executeEdits('html-toolbar', [{ range: sel, text: `<img src="${src || 'image.png'}" alt="${alt}" />` }]);
  editor.focus();
}

export function insertTable(editor: Ed) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;
  const table = `\n<table>\n  <thead>\n    <tr>\n      <th>Header 1</th>\n      <th>Header 2</th>\n      <th>Header 3</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Cell 1</td>\n      <td>Cell 2</td>\n      <td>Cell 3</td>\n    </tr>\n    <tr>\n      <td>Cell 4</td>\n      <td>Cell 5</td>\n      <td>Cell 6</td>\n    </tr>\n  </tbody>\n</table>\n`;
  editor.executeEdits('html-toolbar', [{ range: sel, text: table }]);
  editor.focus();
}

export function insertCodeBlock(editor: Ed, lang = '') {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;
  const selected = model.getValueInRange(sel) || 'code here';
  const langAttr = lang ? ` class="language-${lang}"` : '';
  editor.executeEdits('html-toolbar', [{ range: sel, text: `\n<pre><code${langAttr}>${selected}</code></pre>\n` }]);
  editor.focus();
}

export function insertHr(editor: Ed) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;
  editor.executeEdits('html-toolbar', [{ range: sel, text: '\n<hr />\n' }]);
  editor.focus();
}

export function insertDiv(editor: Ed) { insertBlock(editor, 'div', '', ''); }
export function insertSection(editor: Ed) { insertBlock(editor, 'section', '', ''); }

export function insertDetails(editor: Ed) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) return;
  editor.executeEdits('html-toolbar', [{ range: sel, text: '\n<details>\n  <summary>Summary</summary>\n  <p>Details content here.</p>\n</details>\n' }]);
  editor.focus();
}

export function alignLeft(editor: Ed) { wrapTag(editor, 'div', 'style="text-align: left;"', 'Text'); }
export function alignCenter(editor: Ed) { wrapTag(editor, 'div', 'style="text-align: center;"', 'Text'); }
export function alignRight(editor: Ed) { wrapTag(editor, 'div', 'style="text-align: right;"', 'Text'); }
