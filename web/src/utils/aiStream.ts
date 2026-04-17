// Frontend wrapper for streaming AI commands (ai_chat_stream, ai_edit).
// Rust backend emits per-request events: ai-chunk-{id}, ai-done-{id}, ai-error-{id}.

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface StreamHandlers {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

export interface StreamController {
  requestId: string;
  /** Resolves when the stream finishes (done or error). */
  promise: Promise<void>;
  /** Unsubscribes listeners — call on component unmount to prevent leaks. */
  cancel: () => void;
}

interface BaseStreamArgs {
  command: 'ai_chat_stream' | 'ai_edit';
  payload: Record<string, unknown>;
}

async function runStream(
  { command, payload }: BaseStreamArgs,
  handlers: StreamHandlers,
): Promise<StreamController> {
  const requestId = genId();
  const chunkEvent = `ai-chunk-${requestId}`;
  const doneEvent = `ai-done-${requestId}`;
  const errorEvent = `ai-error-${requestId}`;

  if (!isTauri) {
    const promise = new Promise<void>((resolve) => {
      setTimeout(() => {
        handlers.onError('AI streaming requires the Tauri desktop app.');
        resolve();
      }, 10);
    });
    return { requestId, promise, cancel: () => {} };
  }

  const { listen } = await import('@tauri-apps/api/event');

  let unlistenChunk: (() => void) | null = null;
  let unlistenDone: (() => void) | null = null;
  let unlistenError: (() => void) | null = null;
  let settled = false;

  const promise = new Promise<void>((resolve) => {
    const cleanup = () => {
      settled = true;
      unlistenChunk?.();
      unlistenDone?.();
      unlistenError?.();
      resolve();
    };

    Promise.all([
      listen<{ text: string }>(chunkEvent, (e) => {
        if (!settled) handlers.onChunk(e.payload.text);
      }),
      listen<{ full_text: string }>(doneEvent, (e) => {
        if (settled) return;
        handlers.onDone(e.payload.full_text);
        cleanup();
      }),
      listen<{ error: string }>(errorEvent, (e) => {
        if (settled) return;
        handlers.onError(e.payload.error);
        cleanup();
      }),
    ])
      .then(([u1, u2, u3]) => {
        unlistenChunk = u1;
        unlistenDone = u2;
        unlistenError = u3;

        tauriInvoke(command, { requestId, ...payload }).catch((err: unknown) => {
          if (settled) return;
          const msg = err instanceof Error ? err.message : String(err);
          handlers.onError(msg);
          cleanup();
        });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        handlers.onError(msg);
        cleanup();
      });
  });

  return {
    requestId,
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      unlistenChunk?.();
      unlistenDone?.();
      unlistenError?.();
    },
  };
}

export interface AiChatStreamParams {
  messages: { role: string; content: string }[];
  context?: string;
  systemOverride?: string;
}

export async function streamAiChat(
  params: AiChatStreamParams,
  handlers: StreamHandlers,
): Promise<StreamController> {
  return runStream(
    {
      command: 'ai_chat_stream',
      payload: {
        messages: params.messages,
        context: params.context,
        systemOverride: params.systemOverride,
      },
    },
    handlers,
  );
}

export interface AiEditParams {
  instruction: string;
  selectedCode: string;
  language?: string;
}

export async function streamAiEdit(
  params: AiEditParams,
  handlers: StreamHandlers,
): Promise<StreamController> {
  return runStream(
    {
      command: 'ai_edit',
      payload: {
        instruction: params.instruction,
        selectedCode: params.selectedCode,
        language: params.language,
      },
    },
    handlers,
  );
}
