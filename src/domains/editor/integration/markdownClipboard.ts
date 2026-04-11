import { Slice, type ResolvedPos } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';
import { markdownManager } from '../../../services/markdown/MarkdownService';
import {
  consumeNextPasteIntent,
  type PasteIntent,
} from './pasteIntentController';
import {
  stripCommonIndent,
  isSoleDegenerateCodeBlock,
  isRicherParse,
} from './textNormalization';

export {
  createSmartClipboardTextSerializer,
  serializeSliceAsMarkdown,
  serializeSliceAsPlainText,
  containsStructuralNode,
  STRUCTURAL_NODE_TYPES,
  STRUCTURAL_MARK_TYPES,
} from './smartClipboardSerializer';

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

function tryMarkdownParse(text: string): Record<string, unknown> | null {
  try {
    return markdownManager.parse(text);
  } catch {
    return null;
  }
}

function createClipboardTextSlice(
  text: string,
  context: ResolvedPos,
  plain: boolean,
  view: EditorView,
): Slice {
  if (plain || shouldSkipMarkdownParsingForSize(text)) {
    return createPlainTextSlice(text, context, view);
  }

  const json = tryMarkdownParse(text);
  if (!json) {
    return createPlainTextSlice(text, context, view);
  }

  if (isSoleDegenerateCodeBlock(json)) {
    const normalized = stripCommonIndent(text);
    if (normalized !== text) {
      const retryJson = tryMarkdownParse(normalized);
      if (retryJson && isRicherParse(json, retryJson)) {
        const doc = view.state.schema.nodeFromJSON(retryJson);
        return Slice.maxOpen(doc.content);
      }
    }
  }

  const doc = view.state.schema.nodeFromJSON(json);
  return Slice.maxOpen(doc.content);
}

export function createMarkdownClipboardTextParser() {
  return (
    text: string,
    context: ResolvedPos,
    plain: boolean,
    view: EditorView,
  ): Slice => {
    const intent = consumeNextPasteIntent();
    const shouldBypassMarkdown = plain || intent === 'plain';
    return createClipboardTextSlice(text, context, shouldBypassMarkdown, view);
  };
}

export function insertClipboardText(
  editor: Editor,
  text: string,
  intent: PasteIntent = 'default',
): void {
  const { view } = editor;
  const { state } = view;
  const slice = createClipboardTextSlice(
    text,
    state.selection.$from,
    intent === 'plain',
    view,
  );

  view.dispatch(state.tr.replaceSelection(slice).scrollIntoView());
}

export function insertClipboardHtml(editor: Editor, html: string): void {
  editor.chain().focus().insertContent(html).run();
}
