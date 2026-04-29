import { useEffect } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';

interface UseScrollSyncArgs {
  /** Monaco editor instance, or null when not mounted/active. */
  editor: MonacoEditor.IStandaloneCodeEditor | null;
  /** The scrollable preview container (the element with `overflow-y-auto`). */
  previewEl: HTMLElement | null;
  /** When false, do nothing (preserves no-op when split/preview off, or user disabled it). */
  enabled: boolean;
}

/**
 * Bidirectional ratio-based scroll sync between Monaco editor and a preview pane.
 *
 * Strategy: convert each side's scroll position into a 0..1 ratio
 * (`scrollTop / (scrollHeight - clientHeight)`) and mirror it on the other side.
 * Simple but effective when both sides have similar height distributions.
 *
 * To prevent feedback loops (A scrolls B → B's onScroll re-scrolls A → ...) we
 * mark scrolls we initiate ourselves with a short-lived flag that is cleared on
 * the *next* tick (rAF), and any scroll event handled while the flag is set is
 * ignored. This is more robust than a "lock during this call" pattern because
 * the second side's scroll event fires asynchronously after we set scrollTop.
 */
export function useScrollSync({ editor, previewEl, enabled }: UseScrollSyncArgs): void {
  useEffect(() => {
    if (!enabled) return;
    if (!editor || !previewEl) return;

    // Marks set when we (this hook) trigger a scroll programmatically. The next
    // scroll event from that side will see the flag and bail out.
    let suppressEditor = false;
    let suppressPreview = false;
    let rafId: number | null = null;

    const clearFlagsNextFrame = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        suppressEditor = false;
        suppressPreview = false;
        rafId = null;
      });
    };

    const editorRatio = (): number => {
      const scrollTop = editor.getScrollTop();
      const scrollHeight = editor.getScrollHeight();
      const clientHeight = editor.getLayoutInfo().height;
      const max = Math.max(0, scrollHeight - clientHeight);
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, scrollTop / max));
    };

    const previewRatio = (): number => {
      const max = Math.max(0, previewEl.scrollHeight - previewEl.clientHeight);
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, previewEl.scrollTop / max));
    };

    const setEditorRatio = (r: number) => {
      const scrollHeight = editor.getScrollHeight();
      const clientHeight = editor.getLayoutInfo().height;
      const max = Math.max(0, scrollHeight - clientHeight);
      suppressEditor = true;
      editor.setScrollTop(r * max);
      clearFlagsNextFrame();
    };

    const setPreviewRatio = (r: number) => {
      const max = Math.max(0, previewEl.scrollHeight - previewEl.clientHeight);
      suppressPreview = true;
      previewEl.scrollTop = r * max;
      clearFlagsNextFrame();
    };

    const onEditorScroll = () => {
      if (suppressEditor) return;
      setPreviewRatio(editorRatio());
    };

    const onPreviewScroll = () => {
      if (suppressPreview) return;
      setEditorRatio(previewRatio());
    };

    // Monaco's onDidScrollChange returns a disposable.
    const disposable = editor.onDidScrollChange(onEditorScroll);
    previewEl.addEventListener('scroll', onPreviewScroll, { passive: true });

    return () => {
      disposable.dispose();
      previewEl.removeEventListener('scroll', onPreviewScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [editor, previewEl, enabled]);
}
