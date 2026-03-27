import { Slice, type ResolvedPos } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { markdownManager } from '../../../services/markdown/MarkdownService';

export const MARKDOWN_CLIPBOARD_MAX_PARSE_BYTES = 50 * 1024;

export function shouldSkipMarkdownParsingForSize(text: string): boolean {
  return (
    new TextEncoder().encode(text).length > MARKDOWN_CLIPBOARD_MAX_PARSE_BYTES
  );
}

function createPlainTextSlice(
  text: string,
  context: ResolvedPos,
  view: EditorView,
): Slice {
  const { schema } = view.state;
  const marks = context.marks();
  const blocks = text.split(/(?:\r\n?|\n)+/);
  const content = blocks.map((block) =>
    schema.node(
      'paragraph',
      null,
      block.length > 0 ? [schema.text(block, marks)] : undefined,
    ),
  );
  const doc = schema.node('doc', null, content);

  return Slice.maxOpen(doc.content);
}

export function createMarkdownClipboardTextParser() {
  return (
    text: string,
    context: ResolvedPos,
    plain: boolean,
    view: EditorView,
  ): Slice => {
    if (plain || shouldSkipMarkdownParsingForSize(text)) {
      return createPlainTextSlice(text, context, view);
    }

    try {
      const json = markdownManager.parse(text);
      const doc = view.state.schema.nodeFromJSON(json);
      return Slice.maxOpen(doc.content);
    } catch {
      return createPlainTextSlice(text, context, view);
    }
  };
}

export function createMarkdownClipboardTextSerializer() {
  return (slice: Slice): string => {
    const json = slice.content.toJSON();

    if (!json || (Array.isArray(json) && json.length === 0)) {
      return '';
    }

    return markdownManager.serialize({
      type: 'doc',
      content: Array.isArray(json) ? json : [json],
    });
  };
}
