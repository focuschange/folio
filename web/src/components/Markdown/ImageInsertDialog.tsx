import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X } from 'lucide-react';

interface ImageInsertDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (result: { url: string; alt: string; width?: number; height?: number }) => void;
}

export function ImageInsertDialog({ open, onClose, onInsert }: ImageInsertDialogProps) {
  const theme = useAppStore(s => s.settings.theme);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const urlRef = useRef<HTMLInputElement>(null);

  // Focus URL field when dialog opens
  useEffect(() => {
    if (open) {
      setUrl('');
      setAlt('');
      setWidth('');
      setHeight('');
      setTimeout(() => urlRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = useCallback(() => {
    if (!url.trim()) return;
    onInsert({
      url: url.trim(),
      alt: alt.trim(),
      width: width ? parseInt(width, 10) || undefined : undefined,
      height: height ? parseInt(height, 10) || undefined : undefined,
    });
    onClose();
  }, [url, alt, width, height, onInsert, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  if (!open) return null;

  const bg = theme === 'dark' ? 'bg-zinc-800' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-600' : 'border-zinc-300';
  const inputBg = theme === 'dark' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-800';
  const labelColor = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const overlay = theme === 'dark' ? 'bg-black/50' : 'bg-black/30';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${overlay}`} onClick={onClose}>
      <div
        className={`${bg} border ${border} rounded-lg shadow-2xl w-[400px] p-4`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Insert Image</span>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-zinc-600/30">
            <X size={14} />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className={`block text-[11px] mb-1 ${labelColor}`}>Image URL *</label>
            <input
              ref={urlRef}
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="file:///path/to/image.png or https://..."
              className={`w-full px-2.5 py-1.5 rounded text-xs ${inputBg} border ${border} outline-none focus:border-blue-500`}
            />
          </div>
          <div>
            <label className={`block text-[11px] mb-1 ${labelColor}`}>Alt Text</label>
            <input
              type="text"
              value={alt}
              onChange={e => setAlt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Image description"
              className={`w-full px-2.5 py-1.5 rounded text-xs ${inputBg} border ${border} outline-none focus:border-blue-500`}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={`block text-[11px] mb-1 ${labelColor}`}>Width (px)</label>
              <input
                type="number"
                value={width}
                onChange={e => setWidth(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="auto"
                className={`w-full px-2.5 py-1.5 rounded text-xs ${inputBg} border ${border} outline-none focus:border-blue-500`}
              />
            </div>
            <div className="flex-1">
              <label className={`block text-[11px] mb-1 ${labelColor}`}>Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={e => setHeight(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="auto"
                className={`w-full px-2.5 py-1.5 rounded text-xs ${inputBg} border ${border} outline-none focus:border-blue-500`}
              />
            </div>
          </div>
        </div>

        {/* Output format info */}
        <div className={`mt-3 px-2.5 py-2 rounded text-[10px] leading-relaxed ${
          theme === 'dark' ? 'bg-zinc-700/50 text-zinc-400' : 'bg-zinc-50 text-zinc-500'
        }`}>
          {(width || height) ? (
            <>
              <span className="font-semibold text-yellow-500">HTML</span> — 크기 지정 시 <code className="font-mono">&lt;img&gt;</code> 태그로 삽입됩니다 (GitHub 호환)
            </>
          ) : (
            <>
              <span className="font-semibold text-blue-400">Markdown</span> — 크기 미지정 시 <code className="font-mono">![alt](url)</code> 표준 문법으로 삽입됩니다
            </>
          )}
        </div>

        {/* Preview of output */}
        {url && (
          <div className={`mt-2 text-[10px] ${labelColor}`}>
            <span className="opacity-60">Result: </span>
            <code className="font-mono break-all">
              {(width || height)
                ? `<img src="${url.trim()}" alt="${alt.trim() || ''}"${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''} />`
                : `![${alt.trim() || 'image'}](${url.trim()})`
              }
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className={`px-3 py-1.5 rounded text-xs ${theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim()}
            className={`px-3 py-1.5 rounded text-xs text-white ${
              url.trim() ? 'bg-blue-600 hover:bg-blue-500' : 'bg-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
