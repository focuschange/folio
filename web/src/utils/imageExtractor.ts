import type { ImageInfo } from '../types';

// Markdown image: ![alt](url)
// Supports balanced parentheses in URL (e.g. "slack-avatar%20(1).png")
const MD_IMAGE_RE = /!\[([^\]]*)\]\(((?:[^()]*|\([^()]*\))*)\)/g;

// HTML image: <img ... src="url" ... > (also captures alt attribute if present)
const HTML_IMG_RE = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
const HTML_ALT_RE = /alt=["']([^"']*?)["']/i;

/**
 * Extract all images (markdown + HTML) from text content.
 * Returns line numbers so the UI can jump to the image definition.
 */
export function extractImages(content: string): ImageInfo[] {
  const images: ImageInfo[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Markdown images
    let match: RegExpExecArray | null;
    MD_IMAGE_RE.lastIndex = 0;
    while ((match = MD_IMAGE_RE.exec(line)) !== null) {
      images.push({
        alt: match[1] || '',
        url: match[2],
        lineNumber,
        kind: 'markdown',
      });
    }

    // HTML images
    HTML_IMG_RE.lastIndex = 0;
    while ((match = HTML_IMG_RE.exec(line)) !== null) {
      const altMatch = match[0].match(HTML_ALT_RE);
      images.push({
        alt: altMatch?.[1] || '',
        url: match[1],
        lineNumber,
        kind: 'html',
      });
    }
  }

  return images;
}
