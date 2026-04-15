import type { LinkInfo } from '../types';

/**
 * Extract links from text content, per language.
 */
export function extractLinks(content: string, language: string): LinkInfo[] {
  const results: LinkInfo[] = [];
  const lines = content.split('\n');

  // Markdown links: [text](url)
  const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  // HTML anchor: <a href="url">text</a>
  const htmlRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  // Bare URLs
  const urlRegex = /https?:\/\/[^\s<>"'`]+/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const seen = new Set<string>();

    if (language === 'markdown' || language === 'mdx') {
      let m: RegExpExecArray | null;
      const re = new RegExp(mdRegex.source, 'g');
      while ((m = re.exec(line)) !== null) {
        const key = `${m[2]}|${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ text: m[1], url: m[2], lineNumber: i + 1, kind: 'markdown' });
      }
    }

    if (language === 'html' || language === 'xml' || language === 'markdown') {
      let m: RegExpExecArray | null;
      const re = new RegExp(htmlRegex.source, 'gi');
      while ((m = re.exec(line)) !== null) {
        const key = `${m[1]}|${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ text: m[2] || m[1], url: m[1], lineNumber: i + 1, kind: 'html' });
      }
    }

    // Always also extract bare URLs
    let m: RegExpExecArray | null;
    const re = new RegExp(urlRegex.source, 'g');
    while ((m = re.exec(line)) !== null) {
      const url = m[0];
      const key = `${url}|${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ text: url, url, lineNumber: i + 1, kind: 'raw' });
    }
  }

  return results;
}
