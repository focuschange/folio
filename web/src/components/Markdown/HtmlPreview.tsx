import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Pre-process HTML content: replace local file references (src="file:///...", href="file:///...")
 * with Tauri asset protocol URLs so images/CSS load correctly in the iframe.
 */
function preprocessHtml(content: string): string {
  if (!isTauri) return content;

  // Replace src="file:///..." and href="file:///..."
  return content.replace(
    /(src|href)=["'](file:\/\/\/[^"']+)["']/gi,
    (_match, attr: string, fileUrl: string) => {
      const decoded = decodeURIComponent(fileUrl);
      const localPath = decoded.slice(7); // remove file://
      return `${attr}="asset://localhost${localPath}"`;
    }
  );
}

interface HtmlPreviewProps {
  content: string;
}

export function HtmlPreview({ content }: HtmlPreviewProps) {
  const theme = useAppStore(s => s.settings.theme);

  const processed = useMemo(() => preprocessHtml(content), [content]);

  // Inject a base style for dark/light background if the HTML doesn't have its own
  const wrappedContent = useMemo(() => {
    const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    const textColor = theme === 'dark' ? '#d4d4d4' : '#1e1e1e';
    // Only inject defaults if the HTML doesn't contain <style> or <link> tags
    const hasOwnStyles = /<(style|link\s)/i.test(processed);
    const defaultStyle = hasOwnStyles
      ? ''
      : `<style>body { background: ${bgColor}; color: ${textColor}; font-family: system-ui, sans-serif; margin: 16px; }</style>`;
    return `${defaultStyle}${processed}`;
  }, [processed, theme]);

  return (
    <div className={`h-full overflow-hidden ${
      theme === 'dark' ? 'bg-zinc-800' : 'bg-white'
    }`}>
      <iframe
        srcDoc={wrappedContent}
        sandbox="allow-scripts allow-same-origin"
        title="HTML Preview"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
