import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { useAppStore } from '../../store/useAppStore';
import {
  useMemo, forwardRef, useEffect, useState, useRef, useCallback,
} from 'react';
import type { Components } from 'react-markdown';
import mermaid from 'mermaid';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const MD_IMG_RE = /!\[([^\]]*)\]\(((?:[^()]*|\([^()]*\))*)\)/g;
const HTML_IMG_RE = /<img\s([^>]*?)src=["']((?:file:\/\/\/|\.\/|\.\.\/|\/)[^"']+)["']([^>]*?)\/?\s*>/gi;

function toAssetUrl(rawUrl: string, filePath?: string): string | null {
  const decoded = decodeURIComponent(rawUrl.trim());
  if (/^https?:\/\//.test(decoded) || decoded.startsWith('asset://')) return null;
  if (decoded.startsWith('file:///')) return `asset://localhost${decoded.slice(7)}`;
  if (decoded.startsWith('/')) return `asset://localhost${decoded}`;
  if (filePath) {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    const abs = `${dir}/${decoded}`.replace(/\/\.\//g, '/');
    return `asset://localhost${abs}`;
  }
  return null;
}

function preprocessImages(content: string, filePath?: string): string {
  if (!isTauri) return content;
  let result = content.replace(MD_IMG_RE, (_match, alt: string, rawUrl: string) => {
    const assetUrl = toAssetUrl(rawUrl, filePath);
    if (!assetUrl) return _match;
    const safeAlt = alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<img src="${assetUrl}" alt="${safeAlt}" style="max-width:100%" />`;
  });
  result = result.replace(HTML_IMG_RE, (_match, before: string, rawUrl: string, after: string) => {
    const assetUrl = toAssetUrl(rawUrl, filePath);
    if (!assetUrl) return _match;
    return `<img ${before}src="${assetUrl}"${after} />`;
  });
  return result;
}

// ─── Mermaid Block ────────────────────────────────────────────────────────────

let mermaidIdSeq = 0;

interface MermaidBlockProps {
  code: string;
  theme: 'dark' | 'light';
}

function MermaidBlock({ code, theme }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  const idRef = useRef(`mermaid-${++mermaidIdSeq}`);

  useEffect(() => {
    let cancelled = false;
    setError(false);

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
    });

    mermaid.render(idRef.current, code).then(({ svg: rendered }) => {
      if (!cancelled) setSvg(rendered);
    }).catch(() => {
      if (!cancelled) setError(true);
    });

    // mermaid reuses the same id — bump on next render
    idRef.current = `mermaid-${++mermaidIdSeq}`;

    return () => { cancelled = true; };
  }, [code, theme]);

  if (error) {
    return (
      <pre className="hljs" style={{ padding: '1em', borderRadius: 6, color: '#f87171', fontSize: '0.85em' }}>
        <code>{code}</code>
      </pre>
    );
  }

  if (!svg) {
    return (
      <div style={{ padding: '1em', opacity: 0.4, fontSize: '0.85em' }}>Rendering diagram…</div>
    );
  }

  return (
    <div
      className="md-mermaid"
      style={{ textAlign: 'center', padding: '0.5em 0' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(getText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [getText]);

  return (
    <button
      className={`md-code-copy${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      title="Copy code"
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ─── Code Block renderer ─────────────────────────────────────────────────────

function makeCodeComponents(theme: 'dark' | 'light'): Components {
  return {
    code({ className, children, ...props }) {
      const isBlock = 'node' in props && (props as { node?: { type?: string } }).node?.type !== undefined;
      const lang = /language-(\w+)/.exec(className ?? '')?.[1] ?? '';
      const raw = String(children).replace(/\n$/, '');

      // inline code — no wrapper needed
      if (!lang && !isBlock) {
        return <code className={className} {...props}>{children}</code>;
      }

      if (lang === 'mermaid') {
        return <MermaidBlock code={raw} theme={theme} />;
      }

      return (
        <div className="md-code-block">
          {lang && <span className="md-code-lang">{lang}</span>}
          <CopyButton getText={() => raw} />
          <pre>
            <code className={className} {...props}>{children}</code>
          </pre>
        </div>
      );
    },
  };
}

// ─── MarkdownPreview ─────────────────────────────────────────────────────────

interface MarkdownPreviewProps {
  content: string;
  filePath?: string;
}

export const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  function MarkdownPreview({ content, filePath }, ref) {
    const theme = useAppStore(s => s.settings.theme);

    const [debouncedContent, setDebouncedContent] = useState(content);
    useEffect(() => {
      const id = setTimeout(() => setDebouncedContent(content), 150);
      return () => clearTimeout(id);
    }, [content]);

    const processed = useMemo(
      () => preprocessImages(debouncedContent, filePath),
      [debouncedContent, filePath],
    );

    const components = useMemo(() => makeCodeComponents(theme), [theme]);

    const isLight = theme === 'light';

    return (
      <div
        ref={ref}
        className={`h-full overflow-y-auto p-6 ${isLight ? 'bg-white text-zinc-800' : 'bg-zinc-800 text-zinc-200'}`}
      >
        <div className={`max-w-3xl mx-auto markdown-body ${isLight ? 'markdown-preview-light' : ''}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
            urlTransform={(url) => url}
            components={components}
          >
            {processed}
          </ReactMarkdown>
        </div>
      </div>
    );
  },
);

// re-export for named imports elsewhere
export type { MarkdownPreviewProps };
export default MarkdownPreview;
