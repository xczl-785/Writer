import type { Editor } from '@tiptap/react';
import type { ResolvedPos, Slice } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import {
  createMarkdownClipboardTextParser as createCoreMarkdownClipboardTextParser,
  insertClipboardText as insertCoreClipboardText,
  type MarkdownClipboardOptions,
} from '../../../core/editor';
import type { PasteIntent } from '../../../core/editor';
import { ErrorService } from '../../../services/error/ErrorService';

export {
  insertClipboardHtml,
  MARKDOWN_CLIPBOARD_MAX_PARSE_BYTES,
  shouldSkipMarkdownParsingForSize,
  type ClipboardIssueLogger,
  type MarkdownClipboardOptions,
} from '../../../core/editor';
export {
  createSmartClipboardTextSerializer,
  serializeSliceAsMarkdown,
  serializeSliceAsPlainText,
  containsStructuralNode,
  STRUCTURAL_NODE_TYPES,
  STRUCTURAL_MARK_TYPES,
} from '../../../core/editor';

function withWriterClipboardLogging(
  options: MarkdownClipboardOptions = {},
): MarkdownClipboardOptions {
  return {
    ...options,
    logSchemaMismatch:
      options.logSchemaMismatch ??
      ((error, context) => ErrorService.log(error, context)),
  };
}

export function createMarkdownClipboardTextParser(
  options: MarkdownClipboardOptions = {},
): (
  text: string,
  context: ResolvedPos,
  plain: boolean,
  view: EditorView,
) => Slice {
  return createCoreMarkdownClipboardTextParser(
    withWriterClipboardLogging(options),
  );
}

export function insertClipboardText(
  editor: Editor,
  text: string,
  intent: PasteIntent = 'default',
  options: MarkdownClipboardOptions = {},
): void {
  insertCoreClipboardText(
    editor,
    text,
    intent,
    withWriterClipboardLogging(options),
  );
}
