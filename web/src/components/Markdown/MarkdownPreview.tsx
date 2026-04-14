import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import { useAppStore } from '../../store/useAppStore';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const theme = useAppStore(s => s.settings.theme);

  return (
    <div className={`h-full overflow-y-auto p-6 ${
      theme === 'dark' ? 'bg-zinc-800 text-zinc-200' : 'bg-white text-zinc-800'
    }`}>
      <div className="max-w-3xl mx-auto markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeHighlight, rehypeKatex]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
