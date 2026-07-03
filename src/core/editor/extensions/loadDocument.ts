/**
 * Editor extension: loadDocument
 *
 * Replaces the editor document with the given content and guarantees three
 * invariants that any "program-driven load" must uphold (see capability
 * `editor-history` CR-002 / CR-003 / CR-006):
 *
 *   1. The replacement transaction is NOT added to the undo stack
 *      (`addToHistory: false`) — so pressing Ctrl+Z right after opening a
 *      file never wipes the freshly loaded content.
 *   2. The transaction does NOT emit `onUpdate` (`preventUpdate: true`) —
 *      autosave's dirty flag must not be tripped by a load.
 *   3. After dispatching, the undo/redo stack is wiped clean by
 *      unregistering and re-registering the ProseMirror history plugin —
 *      so history never leaks across activeFile switches.
 *
 * All file-load paths in the editor MUST go through this command. Direct
 * use of `setContent` for file loading is forbidden (CR-005).
 */
import { Extension } from '@tiptap/core';
import type { Content } from '@tiptap/core';
import { createDocument } from '@tiptap/core';
import { history } from '@tiptap/pm/history';

export interface LoadDocumentHistoryOptions {
  depth: number;
  newGroupDelay: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    loadDocument: {
      /**
       * Replace the whole document with new content, bypassing the undo
       * stack, autosave, and clearing any prior history.
       */
      loadDocument: (content: Content) => ReturnType;
    };
  }
}

export const LoadDocument = Extension.create<LoadDocumentHistoryOptions>({
  name: 'loadDocument',

  addOptions() {
    return {
      depth: 100,
      newGroupDelay: 500,
    };
  },

  addCommands() {
    return {
      loadDocument:
        (content) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;

          const doc = createDocument(content, editor.schema, undefined, {
            errorOnInvalidContent: editor.options.enableContentCheck,
          });

          tr.replaceWith(0, tr.doc.content.size, doc)
            .setMeta('addToHistory', false)
            .setMeta('preventUpdate', true)
            // Dispatch manually below so we can synchronously wipe
            // history right after the replacement lands. Without this
            // flag, CommandManager would dispatch tr a second time.
            .setMeta('preventDispatch', true);

          editor.view.dispatch(tr);

          // Wipe the undo/redo stack by swapping in a fresh history
          // plugin. Tiptap's unregisterPlugin filters by the `history$`
          // key prefix, which matches @tiptap/pm/history's internal key.
          editor.unregisterPlugin('history');
          editor.registerPlugin(
            history({
              depth: this.options.depth,
              newGroupDelay: this.options.newGroupDelay,
            }),
          );

          return true;
        },
    };
  },
});
