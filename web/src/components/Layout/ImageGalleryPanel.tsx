import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMonacoEditorRef } from './Toolbar';
import { extractImages } from '../../utils/imageExtractor';
import { ImageOff } from 'lucide-react';

/**
 * Resolve an image URL to something the webview can display.
 * - Absolute URLs (http/https) → pass through
 * - Relative paths → resolve relative to the current file's directory,
 *   then convert to a Tauri asset URL if running inside Tauri.
 */
function resolveImageUrl(url: string, filePath: string): string {
  // Already an http/https URL — pass through
  if (/^https?:\/\//.test(url)) return url;

  // Decode the URL first (markdown may contain percent-encoded chars like %20)
  const decoded = decodeURIComponent(url);

  // file:// protocol → extract the local path
  let localPath: string | null = null;
  if (decoded.startsWith('file:///')) {
    // file:///Users/... → /Users/...
    localPath = decoded.slice(7);
  } else if (decoded.startsWith('/')) {
    localPath = decoded;
  } else {
    // Relative path → resolve relative to the file's directory
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    localPath = `${dir}/${decoded}`.replace(/\/\.\//g, '/');
  }

  // In Tauri, build the asset URL manually without double-encoding.
  // The asset protocol expects: asset://localhost/<absolute-path>
  if (localPath && '__TAURI_INTERNALS__' in window) {
    // localPath starts with / so we get asset://localhost/Users/...
    return `asset://localhost${localPath}`;
  }
  return localPath || url;
}

export function ImageGalleryPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const activeTabId = useAppStore(s => s.activeTabId);
  const tabs = useAppStore(s => s.tabs);
  const activeTab = tabs.find(t => t.id === activeTabId);

  const images = useMemo(() => {
    if (!activeTab) return [];
    return extractImages(activeTab.content);
  }, [activeTab?.content]);

  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100';
  const text = theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800';

  const handleClick = (lineNumber: number) => {
    const editor = getMonacoEditorRef();
    if (editor) {
      editor.revealLineInCenter(lineNumber);
      editor.setPosition({ lineNumber, column: 1 });
      editor.focus();
    }
  };

  if (!activeTab) {
    return <div className={`p-4 text-xs ${textMuted}`}>Open a file to view images</div>;
  }

  if (images.length === 0) {
    return <div className={`p-4 text-xs ${textMuted}`}>No images found in this file</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wider ${textMuted}`}>
        {images.length} image{images.length !== 1 ? 's' : ''}
      </div>
      <div className="flex-1 overflow-y-auto">
        {images.map((img, idx) => (
          <ImageItem
            key={`${img.lineNumber}-${idx}`}
            alt={img.alt}
            url={img.url}
            lineNumber={img.lineNumber}
            kind={img.kind}
            filePath={activeTab.path}
            theme={theme}
            textMuted={textMuted}
            text={text}
            hoverBg={hoverBg}
            onClick={() => handleClick(img.lineNumber)}
          />
        ))}
      </div>
    </div>
  );
}

function ImageItem({
  alt, url, lineNumber, kind, filePath, theme, textMuted, text, hoverBg, onClick,
}: {
  alt: string;
  url: string;
  lineNumber: number;
  kind: 'markdown' | 'html';
  filePath: string;
  theme: string;
  textMuted: string;
  text: string;
  hoverBg: string;
  onClick: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = useMemo(() => resolveImageUrl(url, filePath), [url, filePath]);

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 cursor-pointer ${hoverBg} ${text}`}
      onClick={onClick}
      title={`Line ${lineNumber} — ${url}`}
    >
      {/* Thumbnail */}
      <div className={`w-12 h-12 shrink-0 rounded overflow-hidden flex items-center justify-center ${
        theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'
      }`}>
        {failed ? (
          <ImageOff size={16} className={textMuted} />
        ) : (
          <img
            src={resolvedUrl}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
            loading="lazy"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {alt && <div className="text-xs truncate">{alt}</div>}
        <div className={`text-[10px] truncate ${textMuted}`}>{url}</div>
        <div className={`text-[10px] ${textMuted}`}>
          Line {lineNumber} · {kind}
        </div>
      </div>
    </div>
  );
}
