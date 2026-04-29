// Module-level drag state shared between drag sources (EditorTabs, FileTree nodes)
// and drop targets (FileTree directories).
//
// Why not just use `dataTransfer.setData()` with custom MIME types?
// Some webviews (notably WKWebView used by Tauri on macOS) strip or fail to
// expose custom MIME types during `dragover`, which prevents the drop target
// from accepting the drop. To stay reliable across environments we keep a
// singleton and fall back to plain-text on the dataTransfer so the native
// drag still initiates.

export type DragPayload =
  | { kind: 'tab'; tabId: string }
  | { kind: 'tree'; path: string }
  | { kind: 'root'; index: number };

let current: DragPayload | null = null;

export function setCurrentDrag(payload: DragPayload): void {
  current = payload;
}

export function getCurrentDrag(): DragPayload | null {
  return current;
}

export function clearCurrentDrag(): void {
  current = null;
}
