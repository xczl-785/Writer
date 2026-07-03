/**
 * Editor extensions - keyboard shortcuts for find/replace functionality
 */
import { Extension } from '@tiptap/core';
import type { Editor as TiptapEditor } from '@tiptap/react';

export type FindReplaceShortcutRuntime = {
  getEditor: () => TiptapEditor | null;
};

export function createFindReplaceShortcutExtension(args: {
  openFindPanel: (mode: 'find' | 'replace') => void;
  undo: (editor: TiptapEditor) => boolean;
  redo: (editor: TiptapEditor) => boolean;
  runtime: FindReplaceShortcutRuntime;
}) {
  const { openFindPanel, undo, redo, runtime } = args;

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
          const editor = runtime.getEditor();
          if (editor) return undo(editor);
          return false;
        },
        'Mod-y': () => {
          const editor = runtime.getEditor();
          if (editor) return redo(editor);
          return false;
        },
        'Mod-Shift-z': () => {
          const editor = runtime.getEditor();
          if (editor) return redo(editor);
          return false;
        },
      };
    },
  });
}
