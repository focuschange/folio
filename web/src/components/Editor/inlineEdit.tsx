// Inline AI edit (⌘K) — controller that orchestrates:
//   - prompt viewZone above the selection
//   - streaming output viewZone below the selection
//   - decorations on the original range (red strikethrough)
//   - Accept/Reject flow that replaces or discards the proposed text
//
// The React UI for the prompt/output lives in separate components rendered
// via createRoot into the viewZone's DOM node.

import { createRoot, type Root } from 'react-dom/client';
import { useState, useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { Loader2, Check, X, Send, Square } from 'lucide-react';
import { streamAiEdit, type StreamController } from '../../utils/aiStream';

type Editor = monaco.editor.ICodeEditor;
type EditorModel = monaco.editor.ITextModel;

interface SessionParams {
  editor: Editor;
  model: EditorModel;
  theme: 'dark' | 'light';
  language: string;
}

let activeSession: InlineEditSession | null = null;

export function startInlineEdit(params: SessionParams): void {
  if (activeSession) {
    activeSession.dispose();
    activeSession = null;
  }
  activeSession = new InlineEditSession(params);
  activeSession.start();
}

class InlineEditSession {
  private editor: Editor;
  private theme: 'dark' | 'light';
  private language: string;
  private originalRange: monaco.Range;
  private originalText: string;
  private promptZoneId: string | null = null;
  private outputZoneId: string | null = null;
  private outputZone: monaco.editor.IViewZone | null = null;
  private promptRoot: Root | null = null;
  private outputRoot: Root | null = null;
  private decorationIds: string[] = [];
  private streamCtrl: StreamController | null = null;
  private disposed = false;
  private revealedOnDone = false;

  constructor({ editor, model, theme, language }: SessionParams) {
    this.editor = editor;
    this.theme = theme;
    this.language = language;

    const sel = editor.getSelection();
    if (sel && !sel.isEmpty()) {
      this.originalRange = new monaco.Range(
        sel.startLineNumber, sel.startColumn,
        sel.endLineNumber, sel.endColumn,
      );
    } else {
      const pos = editor.getPosition() ?? { lineNumber: 1, column: 1 };
      const lineLen = model.getLineMaxColumn(pos.lineNumber);
      this.originalRange = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, lineLen);
    }
    this.originalText = model.getValueInRange(this.originalRange);
  }

  start() {
    this.mountPromptZone();
  }

  private mountPromptZone() {
    const host = document.createElement('div');
    host.className = 'folio-ai-inline-host';

    this.editor.changeViewZones(accessor => {
      this.promptZoneId = accessor.addZone({
        afterLineNumber: Math.max(0, this.originalRange.startLineNumber - 1),
        heightInLines: 3,
        domNode: host,
        suppressMouseDown: false,
      });
    });

    this.promptRoot = createRoot(host);
    this.promptRoot.render(
      <InlineEditPrompt
        theme={this.theme}
        onSubmit={(instruction) => this.handleSubmit(instruction)}
        onCancel={() => this.cancel()}
      />
    );
  }

  private handleSubmit(instruction: string) {
    if (!instruction.trim() || this.disposed) return;

    // Decorate original range as "pending" (strikethrough red)
    this.decorationIds = this.editor.deltaDecorations([], [{
      range: this.originalRange,
      options: {
        inlineClassName: 'folio-ai-original-inline',
        className: 'folio-ai-original-line',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    }]);

    // Mount output zone below the selection
    this.mountOutputZone();

    // Kick off streaming
    this.streamCtrl = null;
    let buffer = '';
    streamAiEdit(
      { instruction, selectedCode: this.originalText, language: this.language },
      {
        onChunk: (delta) => {
          if (this.disposed) return;
          buffer += delta;
          this.updateOutputContent(buffer, 'streaming');
        },
        onDone: (full) => {
          if (this.disposed) return;
          const cleaned = stripCodeFences(full || buffer);
          this.updateOutputContent(cleaned, 'done');
        },
        onError: (err) => {
          if (this.disposed) return;
          this.updateOutputContent(err, 'error');
        },
      },
    ).then(ctrl => { this.streamCtrl = ctrl; });

    // Update prompt zone to show "streaming" indicator (replace prompt UI)
    if (this.promptRoot) {
      this.promptRoot.render(
        <InlineEditStatus
          theme={this.theme}
          onStop={() => this.streamCtrl?.cancel()}
        />
      );
    }
  }

  private outputBuffer = '';
  private outputState: 'streaming' | 'done' | 'error' = 'streaming';

  private mountOutputZone() {
    const host = document.createElement('div');
    host.className = 'folio-ai-inline-host';

    this.outputZone = {
      afterLineNumber: this.originalRange.endLineNumber,
      heightInLines: this.computeZoneHeight(''),
      domNode: host,
      suppressMouseDown: false,
    };

    this.editor.changeViewZones(accessor => {
      this.outputZoneId = accessor.addZone(this.outputZone!);
    });

    this.outputRoot = createRoot(host);
    this.renderOutput();
  }

  /** Zone height in editor lines — 2 lines for header + content lines, capped. */
  private computeZoneHeight(text: string): number {
    const contentLines = text ? text.split('\n').length : 3;
    return Math.max(6, Math.min(30, contentLines + 2));
  }

  private updateOutputContent(text: string, state: 'streaming' | 'done' | 'error') {
    this.outputBuffer = text;
    this.outputState = state;

    // Resize zone to fit streaming content (capped at 30 lines; inner pre scrolls beyond)
    if (this.outputZone && this.outputZoneId) {
      const newHeight = this.computeZoneHeight(text);
      if (this.outputZone.heightInLines !== newHeight) {
        this.outputZone.heightInLines = newHeight;
        const id = this.outputZoneId;
        this.editor.changeViewZones(accessor => {
          accessor.layoutZone(id);
        });
      }
    }

    this.renderOutput();

    // Once on done: scroll output zone into view so user can read & decide
    if (state === 'done' && !this.revealedOnDone) {
      this.revealedOnDone = true;
      const anchorLine = this.originalRange.endLineNumber;
      this.editor.revealLineInCenter(anchorLine, monaco.editor.ScrollType.Smooth);
    }
  }

  private renderOutput() {
    this.outputRoot?.render(
      <InlineEditOutput
        theme={this.theme}
        text={this.outputBuffer}
        state={this.outputState}
        onAccept={() => this.accept()}
        onReject={() => this.cancel()}
      />
    );
  }

  private accept() {
    if (this.disposed) return;
    const text = this.outputBuffer;
    if (!text || this.outputState === 'error') {
      this.cancel();
      return;
    }
    this.editor.executeEdits('ai-inline-edit', [{
      range: this.originalRange,
      text,
    }]);
    this.dispose();
  }

  private cancel() {
    this.dispose();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    this.streamCtrl?.cancel();
    this.streamCtrl = null;

    // Clear decorations
    if (this.decorationIds.length > 0) {
      this.editor.deltaDecorations(this.decorationIds, []);
      this.decorationIds = [];
    }

    // Remove view zones
    const promptId = this.promptZoneId;
    const outputId = this.outputZoneId;
    this.editor.changeViewZones(accessor => {
      if (promptId) accessor.removeZone(promptId);
      if (outputId) accessor.removeZone(outputId);
    });
    this.promptZoneId = null;
    this.outputZoneId = null;

    // Unmount React roots — defer to avoid unmount-during-render warning
    const pr = this.promptRoot; const or = this.outputRoot;
    this.promptRoot = null; this.outputRoot = null;
    setTimeout(() => { pr?.unmount(); or?.unmount(); }, 0);

    if (activeSession === this) activeSession = null;
    this.editor.focus();
  }
}

// -------- UI components --------

function InlineEditPrompt({
  theme, onSubmit, onCancel,
}: {
  theme: 'dark' | 'light';
  onSubmit: (instruction: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Monaco reclaims focus after an action returns, so we need to defer
  // the textarea focus past the current frame.
  useEffect(() => {
    taRef.current?.focus();
    const raf = requestAnimationFrame(() => taRef.current?.focus());
    const t = setTimeout(() => taRef.current?.focus(), 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, []);

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-blue-500/40' : 'border-blue-400/50';
  const inputBg = theme === 'dark' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-50 text-zinc-900';

  return (
    <div className={`flex items-center gap-2 mx-2 my-1 px-2 py-1.5 rounded border ${bg} ${border} shadow-lg`}>
      <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold shrink-0">AI Edit</span>
      <textarea
        ref={taRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(value);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="이 코드를 어떻게 바꿀까요? (Enter 전송, Esc 취소)"
        rows={1}
        className={`flex-1 px-2 py-1 text-xs rounded outline-none resize-none ${inputBg}`}
      />
      <button
        onClick={() => onSubmit(value)}
        disabled={!value.trim()}
        className={`p-1 rounded shrink-0 ${
          value.trim()
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
        }`}
        title="Submit (Enter)"
      >
        <Send size={12} />
      </button>
      <button
        onClick={onCancel}
        className="p-1 rounded shrink-0 text-zinc-400 hover:text-red-400"
        title="Cancel (Esc)"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function InlineEditStatus({ theme, onStop }: { theme: 'dark' | 'light'; onStop: () => void }) {
  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const border = theme === 'dark' ? 'border-blue-500/40' : 'border-blue-400/50';
  return (
    <div className={`flex items-center gap-2 mx-2 my-1 px-2 py-1.5 rounded border ${bg} ${border} shadow-lg`}>
      <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold shrink-0">AI Edit</span>
      <div className="flex-1 flex items-center gap-2 text-xs text-zinc-400">
        <Loader2 size={12} className="animate-spin" />
        <span>Generating…</span>
      </div>
      <button
        onClick={onStop}
        className="p-1 rounded bg-red-600 text-white hover:bg-red-500 shrink-0"
        title="Stop"
      >
        <Square size={12} />
      </button>
    </div>
  );
}

function InlineEditOutput({
  theme, text, state, onAccept, onReject,
}: {
  theme: 'dark' | 'light';
  text: string;
  state: 'streaming' | 'done' | 'error';
  onAccept: () => void;
  onReject: () => void;
}) {
  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const codeBg = theme === 'dark' ? 'bg-emerald-900/20' : 'bg-emerald-50';
  const border = state === 'error'
    ? 'border-red-500/50'
    : theme === 'dark' ? 'border-emerald-500/40' : 'border-emerald-400/50';

  // Bind Accept/Reject keys while output is shown (only when done)
  useEffect(() => {
    if (state !== 'done') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); onAccept(); }
      else if (e.key === 'Escape') { e.preventDefault(); onReject(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [state, onAccept, onReject]);

  // Auto-scroll output pre to the bottom as new chunks arrive
  const preRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (state === 'streaming' && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [text, state]);

  return (
    <div className={`mx-2 my-1 rounded border ${bg} ${border} shadow-lg flex flex-col h-full overflow-hidden`}>
      <div className="flex-shrink-0 flex items-center justify-between px-2 py-1 border-b border-white/5">
        <span className={`text-[10px] uppercase tracking-wider font-semibold ${state === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {state === 'error' ? 'Error' : state === 'streaming' ? 'Streaming…' : 'Proposed'}
        </span>
        {state === 'done' && (
          <div className="flex items-center gap-1">
            <button
              onClick={onAccept}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-600 text-white hover:bg-emerald-500"
              title="Accept (Enter)"
            >
              <Check size={11} />
              Accept ⏎
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
              title="Reject (Esc)"
            >
              <X size={11} />
              Reject Esc
            </button>
          </div>
        )}
        {state === 'error' && (
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
          >
            <X size={11} />
            Dismiss
          </button>
        )}
      </div>
      <pre ref={preRef} className={`m-0 px-2 py-1 text-[11px] overflow-auto flex-1 min-h-0 ${codeBg} ${state === 'error' ? 'text-red-400' : ''}`}>
        <code>{text || (state === 'streaming' ? '…' : '')}</code>
      </pre>
    </div>
  );
}

/** Strip accidental markdown code fences from the AI response. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fence = /^```[\w-]*\n([\s\S]*?)\n```$/;
  const m = fence.exec(trimmed);
  return m ? m[1] : trimmed;
}
