/**
 * Schema consistency invariant — capability markdown-clipboard CR-018.
 *
 * The editor's ProseMirror schema MUST be a superset (at the mark and
 * node type level) of the Markdown manager's schema. Otherwise
 * `markdownManager.parse(text)` can produce JSON containing types
 * unknown to the editor, and `schema.nodeFromJSON(json)` will throw
 * from deep inside ProseMirror during paste and file-load code paths.
 * Since those call sites live behind DOM event handlers, the throws
 * get swallowed and the user sees silent failures such as "Ctrl+V
 * does nothing" or "the file opens empty".
 *
 * This test enumerates both schemas at build time and enforces the
 * subset relationship. If it goes red, a new mark/node type has been
 * added to `MarkdownService` without a matching entry in
 * `editorExtensions` — fix by registering the missing extension on
 * the editor side, NOT by removing it from the Markdown side.
 */
import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import { createEditorSchemaExtensions } from '../core/editorExtensions';
import { markdownExtensions } from '../../../services/markdown/MarkdownService';

describe('editor/markdown schema consistency (CR-018)', () => {
  const editorSchema = getSchema(
    createEditorSchemaExtensions({ activeFile: null }),
  );
  const markdownSchema = getSchema(markdownExtensions);

  it('every mark type known to MarkdownService is known to the editor', () => {
    const missing = Object.keys(markdownSchema.marks).filter(
      (name) => !(name in editorSchema.marks),
    );
    expect(missing).toEqual([]);
  });

  it('every node type known to MarkdownService is known to the editor', () => {
    const missing = Object.keys(markdownSchema.nodes).filter(
      (name) => !(name in editorSchema.nodes),
    );
    expect(missing).toEqual([]);
  });
});
