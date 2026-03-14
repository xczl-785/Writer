/**
 * Editor extensions - custom keydown handler for special key events
 */
import { TextSelection } from '@tiptap/pm/state';
import { CellSelection, deleteCellSelection } from '@tiptap/pm/tables';
import type { EditorView } from '@tiptap/pm/view';

/**
 * Creates a keydown handler for special editor key events:
 * - Cmd/Ctrl+S: Save trigger (logged, actual save handled elsewhere)
 * - Backspace/Delete in table cell selection: Delete cell content
 * - ArrowLeft at block start before table: Navigate into table
 */
export function createEditorKeyDownHandler() {
  return (view: EditorView, event: KeyboardEvent): boolean => {
    // Cmd/Ctrl + S: Save
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      console.log('Save triggered via Cmd+S');
      return true;
    }

    // Backspace/Delete in table cell selection
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

    // ArrowLeft navigation at block start before table
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
