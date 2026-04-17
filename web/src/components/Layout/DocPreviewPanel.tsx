import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BookOpen, ExternalLink, Globe, ArrowRight } from 'lucide-react';

/** Extract JSDoc / docstring comments from source code */
function extractDocs(content: string, language: string): string[] {
  const docs: string[] = [];

  if (['javascript', 'typescript', 'java', 'kotlin', 'rust', 'go', 'cpp', 'c', 'csharp'].includes(language)) {
    // JSDoc / block comments: /** ... */
    const re = /\/\*\*[\s\S]*?\*\//g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const cleaned = m[0]
        .replace(/^\/\*\*\s*/, '')
        .replace(/\s*\*\/$/, '')
        .split('\n')
        .map(l => l.replace(/^\s*\*\s?/, ''))
        .join('\n')
        .trim();
      if (cleaned) docs.push(cleaned);
    }
  } else if (language === 'python') {
    // Python docstrings: """...""" or '''...'''
    const re = /(?:"""[\s\S]*?"""|'''[\s\S]*?''')/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const cleaned = m[0].replace(/^['"]{'3}/, '').replace(/['"]{'3}$/, '').trim();
      if (cleaned) docs.push(cleaned);
    }
  } else if (language === 'ruby') {
    // Ruby: =begin ... =end
    const re = /=begin[\s\S]*?=end/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const cleaned = m[0].replace(/^=begin\s*/, '').replace(/\s*=end$/, '').trim();
      if (cleaned) docs.push(cleaned);
    }
  }

  return docs.slice(0, 20); // Limit to 20 doc blocks
}

const quickLinks: { label: string; url: string; icon: typeof Globe }[] = [
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/', icon: Globe },
  { label: 'TypeScript Docs', url: 'https://www.typescriptlang.org/docs/', icon: Globe },
  { label: 'React Docs', url: 'https://react.dev/', icon: Globe },
  { label: 'Rust Docs', url: 'https://doc.rust-lang.org/std/', icon: Globe },
  { label: 'Python Docs', url: 'https://docs.python.org/3/', icon: Globe },
  { label: 'Java Docs', url: 'https://docs.oracle.com/en/java/', icon: Globe },
  { label: 'npm', url: 'https://www.npmjs.com/', icon: Globe },
  { label: 'crates.io', url: 'https://crates.io/', icon: Globe },
];

export function DocPreviewPanel() {
  const theme = useAppStore(s => s.settings.theme);
  const tabs = useAppStore(s => s.tabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [showIframe, setShowIframe] = useState(false);

  const docs = useMemo(() => {
    if (!activeTab) return [];
    return extractDocs(activeTab.content, activeTab.language);
  }, [activeTab?.content, activeTab?.language]);

  const navigate = (u: string) => {
    const full = u.startsWith('http') ? u : `https://${u}`;
    setIframeUrl(full);
    setUrl(full);
    setShowIframe(true);
  };

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';
  const inputBg = theme === 'dark' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800';

  return (
    <div className={`h-full flex flex-col ${bg} overflow-hidden`}>
      {/* URL bar */}
      <div className={`px-3 py-2 border-b ${border}`}>
        <form
          onSubmit={e => { e.preventDefault(); navigate(url); }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded ${inputBg}`}
        >
          <Globe size={12} className={textMuted} />
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Enter documentation URL..."
            className="flex-1 bg-transparent text-xs outline-none"
          />
          <button type="submit" className={`${textMuted} hover:text-blue-400`}>
            <ArrowRight size={12} />
          </button>
        </form>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {showIframe && iframeUrl ? (
          <div className="h-full flex flex-col">
            <div className={`flex items-center justify-between px-3 py-1 border-b ${border}`}>
              <span className={`text-[10px] truncate ${textMuted}`}>{iframeUrl}</span>
              <div className="flex items-center gap-1">
                <a
                  href={iframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${textMuted} hover:text-blue-400`}
                >
                  <ExternalLink size={10} />
                </a>
                <button onClick={() => setShowIframe(false)} className={`text-[10px] ${textMuted} hover:text-red-400`}>
                  Close
                </button>
              </div>
            </div>
            <iframe
              src={iframeUrl}
              className="flex-1 border-none"
              title="Doc Preview"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        ) : (
          <>
            {/* Quick links */}
            <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${textMuted} border-b ${border}`}>
              Quick Links
            </div>
            <div className="grid grid-cols-2 gap-0.5 p-1">
              {quickLinks.map(link => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.url)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded ${hoverBg} text-left`}
                >
                  <link.icon size={12} className="text-blue-400 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </button>
              ))}
            </div>

            {/* Extracted docs */}
            <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${textMuted} border-t border-b ${border} mt-1`}>
              File Documentation ({docs.length})
            </div>
            {docs.length === 0 ? (
              <div className={`px-3 py-4 text-center text-xs ${textMuted}`}>
                <BookOpen size={20} className="mx-auto mb-2 opacity-30" />
                No documentation found in current file
              </div>
            ) : (
              docs.map((doc, i) => (
                <div
                  key={i}
                  className={`px-3 py-2 text-xs border-b ${border} ${
                    theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{doc}</pre>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
