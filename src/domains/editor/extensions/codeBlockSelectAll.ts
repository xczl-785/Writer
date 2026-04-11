/**
 * CR-019: single-level Ctrl+A inside a codeBlock selects the block
 * content, with a stateless escape hatch.
 *
 * When the cursor is inside a `codeBlock` and the user invokes
 * `Mod-a`, the first press sets the selection to the block's
 * content range. If the selection already matches the block content
 * exactly, the shortcut handler returns `false` — letting Tiptap /
 * ProseMirror's default `selectAll` command escalate the selection
 * to the whole document. This gives a natural "first press = block,
 * second press = whole doc" gesture without any cross-keypress
 * state tracking: the escalation decision is computed solely from
 * the current selection shape at call time.
 *
 * The rule applies ONLY when the cursor is inside a codeBlock. In
 * every other context (paragraph, heading, blockquote, list, table,
 * empty doc) the handler returns `false` and the default selectAll
 * behavior fires, preserving user muscle memory from every other
 * editor.
 *
 * See capability `markdown-clipboard` CR-019 for the full rule and
 * its interaction with CR-013 Detector B (which then routes the
 * resulting selection through plain-text projection).
 */
import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

export const CodeBlockSelectAll = Extension.create({
  name: 'codeBlockSelectAll',

  addKeyboardShortcuts() {
    return {
      'Mod-a': () => {
        const { state, view } = this.editor;
        const { $from } = state.selection;

        if ($from.parent.type.name !== 'codeBlock') return false;

        const start = $from.start();
        const end = $from.end();

        // Escape hatch: if the current selection already exactly
        // covers the code block's content, decline to handle the
        // shortcut so the default selectAll command escalates to
        // the whole document.
        if (state.selection.from === start && state.selection.to === end) {
          return false;
        }

        view.dispatch(
          state.tr.setSelection(TextSelection.create(state.doc, start, end)),
        );
        return true;
      },
    };
  },
});
