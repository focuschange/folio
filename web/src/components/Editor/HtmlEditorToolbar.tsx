import { useState, useCallback, useLayoutEffect, useRef, useMemo } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Code2,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered,
  Link2, Image as ImageIcon, Table2,
  AlignLeft, AlignCenter, AlignRight,
  Code, Minus, ChevronDown,
  Highlighter, Superscript, Subscript,
  Eye, EyeOff,
  Quote,
  LayoutTemplate,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getMonacoEditorRef } from '../Layout/Toolbar';
import { ToolbarButton, ToolbarSeparator } from '../Layout/Toolbar';
import { MoreMenuDropdown, type MoreMenuItem } from '../Layout/MoreMenuDropdown';
import * as html from '../../utils/htmlActions';

// --- Heading dropdown ---
function HeadingDropdown({ onSelect, disabled }: { onSelect: (level: 1|2|3|4|5|6) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const theme = useAppStore(s => s.settings.theme);
  const menuBg = theme === 'dark' ? 'bg-zinc-800 border-zinc-600 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100';
  const btnBg = theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600';

  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${btnBg} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span>Heading</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 w-32 rounded shadow-lg border z-50 py-1 ${menuBg}`}>
          {([1,2,3,4,5,6] as (1|2|3|4|5|6)[]).map(level => (
            <button
              key={level}
              onMouseDown={() => { onSelect(level); setOpen(false); }}
              className={`w-full text-left px-3 py-1 text-xs transition-colors ${hoverBg}`}
            >
              H{level} — Heading {level}
            </button>
          ))}
          <button
            onMouseDown={() => { onSelect(1); setOpen(false); }}
            className={`w-full text-left px-3 py-1 text-xs transition-colors ${hoverBg}`}
          >
            ¶ Paragraph
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main component ---
interface HtmlEditorToolbarProps {
  theme: string;
  activeTab: boolean;
  previewVisible: boolean;
  onTogglePreview: () => void;
}

interface ItemDef {
  id: string;
  label: string;
  tooltip: string;
  icon: React.ReactNode;
  menuIcon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  group?: boolean;
}

export function HtmlEditorToolbar({ theme, activeTab, previewVisible, onTogglePreview }: HtmlEditorToolbarProps) {
  const iconSize = 15;
  const iconColor = theme === 'dark' ? '#a1a1aa' : '#52525b';
  const borderCls = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200';
  const bgCls = theme === 'dark' ? 'bg-zinc-800' : 'bg-white';

  const get = useCallback(() => getMonacoEditorRef(), []);

  const handleHeading = useCallback((level: 1|2|3|4|5|6) => { const e = get(); if (e) html.heading(e, level); }, [get]);
  const handleBold = useCallback(() => { const e = get(); if (e) html.bold(e); }, [get]);
  const handleItalic = useCallback(() => { const e = get(); if (e) html.italic(e); }, [get]);
  const handleUnderline = useCallback(() => { const e = get(); if (e) html.underline(e); }, [get]);
  const handleStrikethrough = useCallback(() => { const e = get(); if (e) html.strikethrough(e); }, [get]);
  const handleCode = useCallback(() => { const e = get(); if (e) html.inlineCode(e); }, [get]);
  const handleMark = useCallback(() => { const e = get(); if (e) html.mark(e); }, [get]);
  const handleSmall = useCallback(() => { const e = get(); if (e) html.small(e); }, [get]);
  const handleSup = useCallback(() => { const e = get(); if (e) html.superscript(e); }, [get]);
  const handleSub = useCallback(() => { const e = get(); if (e) html.subscript(e); }, [get]);
  const handleBlockquote = useCallback(() => { const e = get(); if (e) html.blockquote(e); }, [get]);
  const handleUl = useCallback(() => { const e = get(); if (e) html.unorderedList(e); }, [get]);
  const handleOl = useCallback(() => { const e = get(); if (e) html.orderedList(e); }, [get]);
  const handleLink = useCallback(() => { const e = get(); if (e) html.insertLink(e); }, [get]);
  const handleImage = useCallback(() => { const e = get(); if (e) html.insertImage(e); }, [get]);
  const handleTable = useCallback(() => { const e = get(); if (e) html.insertTable(e); }, [get]);
  const handleCodeBlock = useCallback(() => { const e = get(); if (e) html.insertCodeBlock(e); }, [get]);
  const handleHr = useCallback(() => { const e = get(); if (e) html.insertHr(e); }, [get]);
  const handleAlignLeft = useCallback(() => { const e = get(); if (e) html.alignLeft(e); }, [get]);
  const handleAlignCenter = useCallback(() => { const e = get(); if (e) html.alignCenter(e); }, [get]);
  const handleAlignRight = useCallback(() => { const e = get(); if (e) html.alignRight(e); }, [get]);
  const handleDetails = useCallback(() => { const e = get(); if (e) html.insertDetails(e); }, [get]);

  const items = useMemo<ItemDef[]>(() => [
    { id: 'bold', label: 'Bold', tooltip: 'Bold <strong>', icon: <Bold size={iconSize} color={iconColor} />, menuIcon: <Bold size={14} />, onClick: handleBold },
    { id: 'italic', label: 'Italic', tooltip: 'Italic <em>', icon: <Italic size={iconSize} color={iconColor} />, menuIcon: <Italic size={14} />, onClick: handleItalic },
    { id: 'underline', label: 'Underline', tooltip: 'Underline <u>', icon: <Underline size={iconSize} color={iconColor} />, menuIcon: <Underline size={14} />, onClick: handleUnderline },
    { id: 'strike', label: 'Strikethrough', tooltip: 'Strikethrough <s>', icon: <Strikethrough size={iconSize} color={iconColor} />, menuIcon: <Strikethrough size={14} />, onClick: handleStrikethrough },
    { id: 'code', label: 'Inline Code', tooltip: 'Inline Code <code>', icon: <Code2 size={iconSize} color={iconColor} />, menuIcon: <Code2 size={14} />, onClick: handleCode },
    { id: 'mark', label: 'Highlight', tooltip: 'Highlight <mark>', icon: <Highlighter size={iconSize} color={iconColor} />, menuIcon: <Highlighter size={14} />, onClick: handleMark },
    { id: 'sup', label: 'Superscript', tooltip: 'Superscript <sup>', icon: <Superscript size={iconSize} color={iconColor} />, menuIcon: <Superscript size={14} />, onClick: handleSup },
    { id: 'sub', label: 'Subscript', tooltip: 'Subscript <sub>', icon: <Subscript size={iconSize} color={iconColor} />, menuIcon: <Subscript size={14} />, onClick: handleSub },
    { id: 'blockquote', label: 'Blockquote', tooltip: 'Blockquote <blockquote>', icon: <Quote size={iconSize} color={iconColor} />, menuIcon: <Quote size={14} />, onClick: handleBlockquote, group: true },
    { id: 'ul', label: 'Bullet List', tooltip: 'Unordered List <ul>', icon: <List size={iconSize} color={iconColor} />, menuIcon: <List size={14} />, onClick: handleUl },
    { id: 'ol', label: 'Numbered List', tooltip: 'Ordered List <ol>', icon: <ListOrdered size={iconSize} color={iconColor} />, menuIcon: <ListOrdered size={14} />, onClick: handleOl },
    { id: 'link', label: 'Link', tooltip: 'Link <a>', icon: <Link2 size={iconSize} color={iconColor} />, menuIcon: <Link2 size={14} />, onClick: handleLink, group: true },
    { id: 'image', label: 'Image', tooltip: 'Image <img>', icon: <ImageIcon size={iconSize} color={iconColor} />, menuIcon: <ImageIcon size={14} />, onClick: handleImage },
    { id: 'table', label: 'Table', tooltip: 'Table <table>', icon: <Table2 size={iconSize} color={iconColor} />, menuIcon: <Table2 size={14} />, onClick: handleTable },
    { id: 'codeblock', label: 'Code Block', tooltip: 'Code Block <pre><code>', icon: <Code size={iconSize} color={iconColor} />, menuIcon: <Code size={14} />, onClick: handleCodeBlock },
    { id: 'hr', label: 'Horizontal Rule', tooltip: 'Horizontal Rule <hr>', icon: <Minus size={iconSize} color={iconColor} />, menuIcon: <Minus size={14} />, onClick: handleHr },
    { id: 'h1', label: 'Heading 1', tooltip: 'Heading 1 <h1>', icon: <Heading1 size={iconSize} color={iconColor} />, menuIcon: <Heading1 size={14} />, onClick: () => handleHeading(1), group: true },
    { id: 'h2', label: 'Heading 2', tooltip: 'Heading 2 <h2>', icon: <Heading2 size={iconSize} color={iconColor} />, menuIcon: <Heading2 size={14} />, onClick: () => handleHeading(2) },
    { id: 'h3', label: 'Heading 3', tooltip: 'Heading 3 <h3>', icon: <Heading3 size={iconSize} color={iconColor} />, menuIcon: <Heading3 size={14} />, onClick: () => handleHeading(3) },
    { id: 'h4', label: 'Heading 4', tooltip: 'Heading 4 <h4>', icon: <Heading4 size={iconSize} color={iconColor} />, menuIcon: <Heading4 size={14} />, onClick: () => handleHeading(4) },
    { id: 'small', label: 'Small', tooltip: 'Small text <small>', icon: <span style={{ fontSize: iconSize, color: iconColor, fontWeight: 600, lineHeight: 1 }}>S↓</span>, menuIcon: <span style={{ fontSize: 12 }}>S↓</span>, onClick: handleSmall },
    { id: 'align-left', label: 'Align Left', tooltip: 'Align Left', icon: <AlignLeft size={iconSize} color={iconColor} />, menuIcon: <AlignLeft size={14} />, onClick: handleAlignLeft, group: true },
    { id: 'align-center', label: 'Align Center', tooltip: 'Align Center', icon: <AlignCenter size={iconSize} color={iconColor} />, menuIcon: <AlignCenter size={14} />, onClick: handleAlignCenter },
    { id: 'align-right', label: 'Align Right', tooltip: 'Align Right', icon: <AlignRight size={iconSize} color={iconColor} />, menuIcon: <AlignRight size={14} />, onClick: handleAlignRight },
    { id: 'details', label: 'Details/Summary', tooltip: 'Details <details>', icon: <LayoutTemplate size={iconSize} color={iconColor} />, menuIcon: <LayoutTemplate size={14} />, onClick: handleDetails, group: true },
    {
      id: 'preview',
      label: previewVisible ? 'Hide Preview' : 'Show Preview',
      tooltip: previewVisible ? 'Hide Preview (⌘⇧V)' : 'Show Preview (⌘⇧V)',
      icon: previewVisible ? <EyeOff size={iconSize} color={iconColor} /> : <Eye size={iconSize} color={iconColor} />,
      menuIcon: previewVisible ? <EyeOff size={14} /> : <Eye size={14} />,
      onClick: onTogglePreview,
      active: previewVisible,
      group: true,
    },
  ], [iconSize, iconColor, previewVisible, onTogglePreview,
    handleBold, handleItalic, handleUnderline, handleStrikethrough, handleCode,
    handleMark, handleSup, handleSub, handleBlockquote, handleUl, handleOl,
    handleLink, handleImage, handleTable, handleCodeBlock, handleHr,
    handleHeading, handleSmall, handleAlignLeft, handleAlignCenter, handleAlignRight, handleDetails]);

  // --- Overflow logic (same pattern as MarkdownToolbarRow) ---
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const moreRef = useRef<HTMLDivElement>(null);
  const widthsRef = useRef<number[]>([]);
  const [visibleCount, setVisibleCount] = useState(items.length);

  useLayoutEffect(() => {
    widthsRef.current = itemRefs.current
      .slice(0, items.length)
      .map(el => (el ? el.getBoundingClientRect().width : 0));
  }, [items.length]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const recompute = () => {
      const widths = widthsRef.current;
      if (widths.length === 0) return;
      const GAP = 2;
      const headingW = headingRef.current?.getBoundingClientRect().width ?? 0;
      const available = container.clientWidth - headingW - GAP * (items.length + 1);
      const totalAll = widths.reduce((a, b) => a + b, 0);
      if (totalAll <= available) { setVisibleCount(items.length); return; }
      const moreW = moreRef.current?.getBoundingClientRect().width || 32;
      let used = moreW;
      let count = 0;
      for (const w of widths) {
        if (used + w > available) break;
        used += w; count++;
      }
      setVisibleCount(Math.max(0, count));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [items.length]);

  const moreItems: MoreMenuItem[] = items
    .slice(visibleCount)
    .map(i => ({ id: i.id, label: i.label, icon: i.menuIcon, onClick: i.onClick }));

  return (
    <div className={`flex items-center px-2 py-1 gap-0.5 border-t border-b ${borderCls} ${bgCls} shrink-0`}>
      {/* Heading dropdown */}
      <div ref={headingRef} className="flex items-center">
        <HeadingDropdown onSelect={handleHeading} disabled={!activeTab} />
        <ToolbarSeparator />
      </div>

      {/* Overflow-aware button row */}
      <div ref={containerRef} className="flex items-center gap-0.5 flex-1 min-w-0">
        {items.map((item, i) => {
          const hidden = i >= visibleCount;
          return (
            <div
              key={item.id}
              ref={el => { itemRefs.current[i] = el; }}
              className={item.group && !hidden ? 'ml-1' : ''}
              style={hidden ? { display: 'none' } : undefined}
            >
              <ToolbarButton
                icon={item.icon}
                tooltip={item.tooltip}
                onClick={item.onClick}
                active={item.active}
                disabled={!activeTab}
              />
            </div>
          );
        })}
        <div
          ref={moreRef}
          style={moreItems.length === 0 ? { display: 'none' } : undefined}
        >
          <MoreMenuDropdown disabled={!activeTab} items={moreItems} />
        </div>
      </div>
    </div>
  );
}

// Re-export for use in EditorArea
export { ToolbarSeparator };
