import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';
import { installClipboardSerializer } from './QuickWriteRichEditor';

const createTestSchema = () =>
  new Schema({
    nodes: {
      doc: { content: 'paragraph+' },
      paragraph: {
        content: 'text*',
        group: 'block',
        parseDOM: [{ tag: 'p' }],
        toDOM: () => ['p', 0],
      },
      text: { group: 'inline' },
    },
  });

describe('QuickWriteRichEditor clipboard serializer mounting', () => {
  it('does not access editor.view before Tiptap reports the editor as mounted', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      join(currentDir, 'QuickWriteRichEditor.tsx'),
      'utf-8',
    );

    expect(source).toContain('onMount');
    expect(source).toContain('installClipboardSerializer(editor)');
    expect(source).not.toContain('editor.view.setProps');
  });

  it('preserves existing editorProps and installs the HTML clipboard serializer after mount', () => {
    const setOptions = vi.fn();
    const existingEditorProps = {
      attributes: { 'aria-label': 'QuickWrite editor' },
      clipboardTextParser: vi.fn(),
      clipboardTextSerializer: vi.fn(),
    };
    const editor = {
      schema: createTestSchema(),
      options: {
        editorProps: existingEditorProps,
      },
      setOptions,
      get view() {
        throw new Error(
          "[tiptap error]: The editor view is not available. Cannot access view['setProps']. The editor may not be mounted yet.",
        );
      },
    } as unknown as Editor;

    installClipboardSerializer(editor);

    expect(setOptions).toHaveBeenCalledTimes(1);
    expect(setOptions).toHaveBeenCalledWith({
      editorProps: {
        ...existingEditorProps,
        clipboardSerializer: expect.any(Object),
      },
    });
  });
});
