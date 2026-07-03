export { FIND_MATCH_LIMIT } from './constants';

export {
  MARKDOWN_CLIPBOARD_MAX_PARSE_BYTES,
  createMarkdownClipboardTextParser,
  insertClipboardHtml,
  insertClipboardText,
  shouldSkipMarkdownParsingForSize,
} from './clipboard/markdownClipboard';
export type {
  ClipboardIssueLogger,
  MarkdownClipboardOptions,
} from './clipboard/markdownClipboard';

export {
  clearNextPasteIntent,
  consumeNextPasteIntent,
  setNextPasteIntent,
} from './clipboard/pasteIntentController';
export type { PasteIntent } from './clipboard/pasteIntentController';

export {
  STRUCTURAL_MARK_TYPES,
  STRUCTURAL_NODE_TYPES,
  containsStructuralNode,
  createSmartClipboardTextSerializer,
  isSelectionWhollyInsideStructuralBlock,
  isSliceJustOneStructuralBlock,
  serializeSliceAsMarkdown,
  serializeSliceAsPlainText,
} from './clipboard/smartClipboardSerializer';

export {
  isRicherParse,
  isSoleDegenerateCodeBlock,
  stripCommonIndent,
} from './clipboard/textNormalization';

export { LoadDocument } from './extensions/loadDocument';
export type { LoadDocumentHistoryOptions } from './extensions/loadDocument';

export {
  collectFindTextMatches,
  getActiveFindMatchIndex,
} from './findReplace/findReplaceDomain';
export type { FindTextMatch } from './findReplace/findReplaceDomain';

export {
  MarkdownService,
  markdownExtensions,
  markdownManager,
} from './markdown/MarkdownService';
export type { EditorJSON } from './markdown/MarkdownService';

export { createEditorSchemaExtensions } from './schema/editorExtensions';
export type {
  EditorExtensionOptions,
  ResolveImageSrc,
} from './schema/editorExtensions';
