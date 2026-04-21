// Render a piece of text with @mention tokens visually highlighted as chips.
// Used in two places:
//   1) As an overlay mirror for the chat textarea (chip-in-input UX)
//   2) Inside user-message chat bubbles (post-submit display)
//
// The component is a pure text renderer: it yields <span>s so CSS handles
// the actual chip styling via `.folio-mention-chip`. Non-mention text is
// preserved verbatim (whitespace-pre-wrap recommended on the wrapper).

import { type ReactNode } from 'react';
import { parseMentions } from '../../utils/mentions';

export function MentionHighlight({
  text,
  className,
}: {
  text: string;
  className?: string;
}): ReactNode {
  const mentions = parseMentions(text);
  if (mentions.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const out: ReactNode[] = [];
  let cursor = 0;
  mentions.forEach((m, i) => {
    if (m.start > cursor) {
      out.push(<span key={`t${i}`}>{text.slice(cursor, m.start)}</span>);
    }
    out.push(
      <span key={`m${i}`} className="folio-mention-chip">
        {m.raw}
      </span>
    );
    cursor = m.end;
  });
  if (cursor < text.length) {
    out.push(<span key="tail">{text.slice(cursor)}</span>);
  }
  return <span className={className}>{out}</span>;
}
