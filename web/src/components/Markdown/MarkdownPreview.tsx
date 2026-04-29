import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { useAppStore } from '../../store/useAppStore';
import { useMemo, forwardRef, useEffect, useState } from 'react';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Markdown image with balanced-parentheses support: ![alt](url-with-(parens))
const MD_IMG_RE = /!\[([^\]]*)\]\(((?:[^()]*|\([^()]*\))*)\)/g;

// HTML <img> tag with src attribute (captures entire tag to preserve width/height/alt/style)
const HTML_IMG_RE = /<img\s([^>]*?)src=["']((?:file:\/\/\/|\.\/|\.\.\/|\/)[^"']+)["']([^>]*?)\/?\s*>/gi;

/** Convert a local URL to asset:// protocol. Returns null if no conversion needed. */
function toAssetUrl(rawUrl: string, filePath?: string): string | null {
  const decoded = decodeURIComponent(rawUrl.trim());

  if (/^https?:\/\//.test(decoded) || decoded.startsWith('asset://')) {
    return null; // already web URL
  } else if (decoded.startsWith('file:///')) {
    return `asset://localhost${decoded.slice(7)}`;
  } else if (decoded.startsWith('/')) {
    return `asset://localhost${decoded}`;
  } else if (filePath) {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    const abs = `${dir}/${decoded}`.replace(/\/\.\//g, '/');
    return `asset://localhost${abs}`;
  }
  return null;
}

/**
 * Pre-process markdown content: convert local image URLs (file:///, absolute, relative)
 * to Tauri asset protocol URLs before ReactMarkdown parses them.
 *
 * Handles both:
 * 1. Markdown syntax: ![alt](local-url) → <img> HTML tag
 * 2. HTML syntax: <img src="file:///..." ...> → src replaced with asset://
 */
function preprocessImages(content: string, filePath?: string): string {
  if (!isTauri) return content;

  // 1. Replace markdown images ![alt](url) → <img> HTML
  let result = content.replace(MD_IMG_RE, (_match, alt: string, rawUrl: string) => {
    const assetUrl = toAssetUrl(rawUrl, filePath);
    if (!assetUrl) return _match;
    const safeAlt = alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<img src="${assetUrl}" alt="${safeAlt}" style="max-width:100%" />`;
  });

  // 2. Replace HTML <img src="file:///..." ...> → src with asset://
  result = result.replace(HTML_IMG_RE, (_match, before: string, rawUrl: string, after: string) => {
    const assetUrl = toAssetUrl(rawUrl, filePath);
    if (!assetUrl) return _match;
    return `<img ${before}src="${assetUrl}"${after} />`;
  });

  return result;
}

interface MarkdownPreviewProps {
  content: string;
  filePath?: string;
}

export const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  function MarkdownPreview({ content, filePath }, ref) {
    const theme = useAppStore(s => s.settings.theme);

    // Debounce content updates to reduce flicker — re-parsing the entire markdown
    // tree on every keystroke is what causes the preview to flash. 150ms feels
    // close to instant but avoids the per-keystroke re-render storm.
    const [debouncedContent, setDebouncedContent] = useState(content);
    useEffect(() => {
      const id = setTimeout(() => setDebouncedContent(content), 150);
      return () => clearTimeout(id);
    }, [content]);

    // Pre-process content to replace local image URLs with asset:// URLs
    const processed = useMemo(() => preprocessImages(debouncedContent, filePath), [debouncedContent, filePath]);

    return (
      <div
        ref={ref}
        className={`h-full overflow-y-auto p-6 ${
          theme === 'dark' ? 'bg-zinc-800 text-zinc-200' : 'bg-white text-zinc-800'
        }`}
      >
        <div className="max-w-3xl mx-auto markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
            urlTransform={(url) => url}
          >
            {processed}
          </ReactMarkdown>
        </div>
      </div>
    );
  }
);
