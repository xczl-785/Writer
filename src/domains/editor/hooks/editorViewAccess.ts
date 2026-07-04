import type { Editor } from '@tiptap/react';

export function getMountedEditorView(editor: Editor | null) {
  if (!editor || editor.isDestroyed) return null;

  try {
    const view = editor.view;
    void view.dom;
    return view;
  } catch {
    return null;
  }
}

export function getMountedEditorDom(editor: Editor | null): HTMLElement | null {
  return getMountedEditorView(editor)?.dom ?? null;
}
