import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { UndoRedo } from '@tiptap/extensions';
import type { JSONContent } from '@tiptap/core';
import { LoadDocument } from '../extensions/loadDocument';

/**
 * Regression tests for capability `editor-history`.
 *
 * CR-002: program-driven loads must not enter the undo stack.
 * CR-003: activeFile switches must wipe undo/redo history.
 * CR-005: all loads must go through `loadDocument`.
 * CR-006: loads must not fire onUpdate (autosave must not be tripped).
 */

const docA: JSONContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Alpha content' }] },
  ],
};

const docB: JSONContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Bravo content' }] },
  ],
};

interface Harness {
  editor: Editor;
  onUpdate: ReturnType<typeof vi.fn>;
}

function createHarness(): Harness {
  const onUpdate = vi.fn();
  const editor = new Editor({
    extensions: [Document, Paragraph, Text, UndoRedo, LoadDocument],
    content: '',
    onUpdate: () => {
      onUpdate();
    },
  });
  return { editor, onUpdate };
}

function text(editor: Editor): string {
  return editor.state.doc.textContent;
}

describe('editor-history capability', () => {
  let harness: Harness | null = null;

  afterEach(() => {
    harness?.editor.destroy();
    harness = null;
  });

  it('CR-002: loadDocument does not push onto the undo stack', () => {
    harness = createHarness();
    const { editor } = harness;

    editor.commands.loadDocument(docA);
    expect(text(editor)).toBe('Alpha content');

    // Undo on an empty history must be a no-op — the freshly loaded
    // content must not be wiped.
    editor.commands.undo();
    expect(text(editor)).toBe('Alpha content');
  });

  it('CR-003: switching files wipes undo history and blocks cross-file undo', () => {
    harness = createHarness();
    const { editor } = harness;

    editor.commands.loadDocument(docA);
    // Simulate a real user edit — this DOES go on the stack.
    editor.chain().focus().insertContent(' edited').run();
    expect(text(editor)).toBe('Alpha content edited');

    // Switch to file B.
    editor.commands.loadDocument(docB);
    expect(text(editor)).toBe('Bravo content');

    // Undo must NOT pull state from file A's history.
    editor.commands.undo();
    expect(text(editor)).toBe('Bravo content');

    // Redo must also be a no-op — no redo branch leaked either.
    editor.commands.redo();
    expect(text(editor)).toBe('Bravo content');
  });

  it('CR-006: loadDocument does not emit onUpdate (autosave untouched)', () => {
    harness = createHarness();
    const { editor, onUpdate } = harness;

    onUpdate.mockClear();
    editor.commands.loadDocument(docA);
    expect(onUpdate).not.toHaveBeenCalled();

    // Sanity check: a real edit DOES fire onUpdate.
    editor.chain().focus().insertContent('!').run();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('CR-004: undo on an empty stack right after load is a safe no-op', () => {
    harness = createHarness();
    const { editor } = harness;

    editor.commands.loadDocument(docA);
    // Multiple undo calls must stay idempotent on an empty stack.
    editor.commands.undo();
    editor.commands.undo();
    editor.commands.undo();
    expect(text(editor)).toBe('Alpha content');
  });

  it('preserves normal undo/redo for real user edits after a load', () => {
    harness = createHarness();
    const { editor } = harness;

    editor.commands.loadDocument(docA);
    editor.chain().focus().insertContent(' more').run();
    expect(text(editor)).toBe('Alpha content more');

    editor.commands.undo();
    expect(text(editor)).toBe('Alpha content');

    editor.commands.redo();
    expect(text(editor)).toBe('Alpha content more');
  });
});
