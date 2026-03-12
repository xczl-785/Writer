import type { Editor as TiptapEditor } from '@tiptap/react';
import { createHandleDOMEvents } from '../pasteHandler';

type EditorRef = { current: TiptapEditor | null };
type EditorAwarePasteHandler = (
  event: ClipboardEvent,
  targetEditor: TiptapEditor | null,
) => boolean | Promise<boolean>;

export function createEditorPasteDOMEvents(
  handlePaste: EditorAwarePasteHandler,
  editorRef: EditorRef,
) {
  return createHandleDOMEvents((event) =>
    handlePaste(event, editorRef.current),
  );
}
