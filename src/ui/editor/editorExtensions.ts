import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { CellSelection, deleteCellSelection } from '@tiptap/pm/tables';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import { TOOLBAR_COMMANDS, type ToolbarCommandId } from './constants';

type EditorRef = { current: TiptapEditor | null };

export function createToolbarShortcutExtension(
  toolbarCommandRunnerRef: {
    current: (id: ToolbarCommandId) => boolean;
  },
  editorRef: EditorRef,
) {
  return Extension.create({
    name: 'editor-toolbar-shortcuts',
    addKeyboardShortcuts() {
      const shortcuts: Record<string, () => boolean> = {};
      for (const cmd of TOOLBAR_COMMANDS) {
        if (!cmd.shortcut) continue;
        shortcuts[cmd.shortcut] = () => toolbarCommandRunnerRef.current(cmd.id);
      }
      for (let i = 1; i <= 6; i++) {
        shortcuts[`Mod-${i}`] = () => {
          if (editorRef.current) {
            return editorRef.current
              .chain()
              .focus()
              .toggleHeading({ level: i as 1 | 2 | 3 | 4 | 5 | 6 })
              .run();
          }
          return false;
        };
      }
      return shortcuts;
    },
  });
}

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

export function createEditorKeyDownHandler() {
  return (view: EditorView, event: KeyboardEvent): boolean => {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      console.log('Save triggered via Cmd+S');
      return true;
    }

    if (
      view.state.selection instanceof CellSelection &&
      (event.key === 'Backspace' || event.key === 'Delete') &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      const handled = deleteCellSelection(view.state, view.dispatch);
      if (handled) {
        event.preventDefault();
        return true;
      }
    }

    if (
      event.key === 'ArrowLeft' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      const { state, dispatch } = view;
      const { selection, doc } = state;

      if (selection instanceof TextSelection && selection.empty) {
        const $anchor = selection.$anchor;
        if ($anchor.parentOffset === 0) {
          const depth = $anchor.depth;
          const parentStartPos = $anchor.start(depth);
          const beforeBlockPos = parentStartPos - 1;

          if (beforeBlockPos >= 0) {
            const $beforeBlock = doc.resolve(beforeBlockPos);
            const nodeBefore = $beforeBlock.nodeBefore;

            if (nodeBefore && nodeBefore.type.name === 'table') {
              event.preventDefault();
              const targetSelection = TextSelection.near(
                doc.resolve(beforeBlockPos),
                -1,
              );
              dispatch(state.tr.setSelection(targetSelection));
              return true;
            }
          }
        }
      }
    }

    return false;
  };
}
