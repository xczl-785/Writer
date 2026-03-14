/**
 * Editor extensions - keyboard shortcuts for find/replace functionality
 */
import { Extension } from '@tiptap/core';
import type { Editor as TiptapEditor } from '@tiptap/react';

type EditorRef = { current: TiptapEditor | null };

export function createFindReplaceShortcutExtension(args: {
  openFindPanel: (mode: 'find' | 'replace') => void;
  undo: (editor: TiptapEditor) => boolean;
  redo: (editor: TiptapEditor) => boolean;
  editorRef: EditorRef;
}) {
  const { openFindPanel, undo, redo, editorRef } = args;

  return Extension.create({
    name: 'editor-find-replace-shortcuts',
    addKeyboardShortcuts() {
      return {
        'Mod-f': () => {
          openFindPanel('find');
          return true;
        },
        'Mod-h': () => {
          openFindPanel('replace');
          return true;
        },
        'Mod-z': () => {
          if (editorRef.current) return undo(editorRef.current);
          return false;
        },
        'Mod-y': () => {
          if (editorRef.current) return redo(editorRef.current);
          return false;
        },
        'Mod-Shift-z': () => {
          if (editorRef.current) return redo(editorRef.current);
          return false;
        },
      };
    },
  });
}
