export function generateTOC(markdown: string): string {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: { level: number; text: string; slug: string }[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const slug = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    headings.push({ level, text, slug });
  }

  if (headings.length === 0) return '';

  const minLevel = Math.min(...headings.map(h => h.level));
  return headings
    .map(h => {
      const indent = '  '.repeat(h.level - minLevel);
      return `${indent}- [${h.text}](#${h.slug})`;
    })
    .join('\n');
}

export function generateTable(rows: number, cols: number, headers?: string[]): string {
  const headerRow = headers
    ? `| ${headers.join(' | ')} |`
    : `| ${Array.from({ length: cols }, (_, i) => `Header ${i + 1}`).join(' | ')} |`;
  const separator = `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`;
  const dataRows = Array.from({ length: rows }, () =>
    `| ${Array.from({ length: cols }, () => '   ').join(' | ')} |`
  ).join('\n');

  return `${headerRow}\n${separator}\n${dataRows}`;
}

export function wrapSelection(
  text: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string
): { newText: string; newSelStart: number; newSelEnd: number } {
  const selected = text.slice(selStart, selEnd);
  const isWrapped = selected.startsWith(before) && selected.endsWith(after);

  if (isWrapped) {
    const unwrapped = selected.slice(before.length, selected.length - after.length);
    const newText = text.slice(0, selStart) + unwrapped + text.slice(selEnd);
    return { newText, newSelStart: selStart, newSelEnd: selStart + unwrapped.length };
  }

  const wrapped = before + selected + after;
  const newText = text.slice(0, selStart) + wrapped + text.slice(selEnd);
  return {
    newText,
    newSelStart: selStart + before.length,
    newSelEnd: selEnd + before.length,
  };
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function countLines(text: string): number {
  if (!text) return 0;
  return text.split('\n').length;
}
