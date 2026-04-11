import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextSelection } from '@tiptap/pm/state';
import { CodeBlockSelectAll } from './codeBlockSelectAll';

/**
 * Tests for capability `markdown-clipboard` CR-019:
 * Ctrl+A inside a codeBlock first selects the block's content;
 * a second press (or any non-codeBlock context) falls through
 * to Tiptap / ProseMirror's default selectAll.
 *
 * The extension is stateless — the escalation decision is
 * computed solely from the current selection shape at call time.
 */

function makeEditor(contentJSON: unknown): Editor {
  return new Editor({
    extensions: [StarterKit, CodeBlockSelectAll],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: contentJSON as any,
  });
}

function findFirstNodePos(
  editor: Editor,
  typeName: string,
): { pos: number; size: number } {
  let hit: { pos: number; size: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (hit) return false;
    if (node.type.name === typeName) {
      hit = { pos, size: node.nodeSize };
      return false;
    }
    return true;
  });
  if (!hit) throw new Error(`node type "${typeName}" not found`);
  return hit;
}

/**
 * Invokes the Mod-a shortcut as the keymap handler would. Returns
 * the boolean indicating whether the extension handled it. If it
 * returns false, simulates Tiptap's default by calling
 * `editor.commands.selectAll()` — this mirrors the real escalation
 * path, where the keymap falls through to the next handler.
 */
function pressModA(editor: Editor): {
  handledByExtension: boolean;
  fromAfter: number;
  toAfter: number;
} {
  const ext = editor.extensionManager.extensions.find(
    (e) => e.name === 'codeBlockSelectAll',
  );
  if (!ext) throw new Error('codeBlockSelectAll extension not registered');
  const shortcuts = (
    ext.config.addKeyboardShortcuts as (this: {
      editor: Editor;
    }) => Record<string, () => boolean>
  ).call({ editor });
  const handler = shortcuts['Mod-a'];
  const handled = handler();
  if (!handled) {
    editor.commands.selectAll();
  }
  return {
    handledByExtension: handled,
    fromAfter: editor.state.selection.from,
    toAfter: editor.state.selection.to,
  };
}

describe('codeBlockSelectAll', () => {
  it('T13: cursor inside codeBlock, first Mod-a → selection covers block content', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: 'fn main() {}' }],
        },
      ],
    });
    const { pos, size } = findFirstNodePos(editor, 'codeBlock');
    // Place cursor somewhere inside the codeBlock.
    editor.view.dispatch(
      editor.state.tr.setSelection(
        TextSelection.create(editor.state.doc, pos + 3),
      ),
    );

    const result = pressModA(editor);
    expect(result.handledByExtension).toBe(true);
    expect(result.fromAfter).toBe(pos + 1);
    expect(result.toAfter).toBe(pos + size - 1);
    editor.destroy();
  });

  it('T14: second Mod-a inside codeBlock → extension returns false, default escalates to whole doc', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'above' }],
        },
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: 'fn main() {}' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'below' }],
        },
      ],
    });
    const { pos, size } = findFirstNodePos(editor, 'codeBlock');
    // Pre-condition: selection already covers exactly the code
    // block's content (as if the user just pressed Mod-a once).
    editor.view.dispatch(
      editor.state.tr.setSelection(
        TextSelection.create(editor.state.doc, pos + 1, pos + size - 1),
      ),
    );

    const result = pressModA(editor);
    expect(result.handledByExtension).toBe(false);
    // After fallthrough to default selectAll, selection should
    // cover the whole document (minus the outer doc boundary).
    expect(result.fromAfter).toBe(0);
    expect(result.toAfter).toBe(editor.state.doc.content.size);
    editor.destroy();
  });

  it('T15: cursor inside a paragraph → extension returns false, default selects whole doc', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'plain paragraph text' }],
        },
      ],
    });
    // Cursor inside the paragraph.
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 3)),
    );

    const result = pressModA(editor);
    expect(result.handledByExtension).toBe(false);
    expect(result.fromAfter).toBe(0);
    expect(result.toAfter).toBe(editor.state.doc.content.size);
    editor.destroy();
  });

  it('T16: cursor inside a blockquote paragraph → extension returns false, default selects whole doc', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'quoted text' }],
            },
          ],
        },
      ],
    });
    // Cursor inside the blockquote's paragraph.
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 4)),
    );

    const result = pressModA(editor);
    expect(result.handledByExtension).toBe(false);
    expect(result.fromAfter).toBe(0);
    expect(result.toAfter).toBe(editor.state.doc.content.size);
    editor.destroy();
  });
});
