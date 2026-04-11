import { Slice, type ResolvedPos } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';
import { markdownManager } from '../../../services/markdown/MarkdownService';
import { ErrorService } from '../../../services/error/ErrorService';
import {
  consumeNextPasteIntent,
  type PasteIntent,
} from './pasteIntentController';
import {
  stripCommonIndent,
  isSoleDegenerateCodeBlock,
  isRicherParse,
} from './textNormalization';

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

/**
 * Converts parsed Markdown JSON into a slice against the editor
 * schema. Returns null if the JSON contains types unknown to the
 * editor schema — callers MUST fall back to a plain-text slice so the
 * paste does not silently disappear (capability markdown-clipboard
 * CR-007 / CR-018 defense in depth).
 */
function tryNodeFromJSON(
  view: EditorView,
  json: Record<string, unknown>,
): Slice | null {
  try {
    const doc = view.state.schema.nodeFromJSON(json);
    return Slice.maxOpen(doc.content);
  } catch (error) {
    ErrorService.log(error, 'markdown clipboard: schema mismatch');
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
        const retrySlice = tryNodeFromJSON(view, retryJson);
        if (retrySlice) return retrySlice;
      }
    }
  }

  const slice = tryNodeFromJSON(view, json);
  if (slice) return slice;
  return createPlainTextSlice(text, context, view);
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
