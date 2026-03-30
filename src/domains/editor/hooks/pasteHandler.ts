import type { EditorView } from '@tiptap/pm/view';
import { createMarkdownClipboardTextParser } from '../integration/markdownClipboard';
import { consumeNextPasteIntent } from '../integration/pasteIntentController';

export type PasteHandler = (
  event: ClipboardEvent,
) => boolean | Promise<boolean>;

/**
 * Detects whether a paste event originates from VSCode editing a markdown file.
 * When true, the HTML payload is a code-editor rendering (monospace, pre-styled
 * divs) that ProseMirror would misinterpret as a code block. In that case we
 * should discard the HTML and let the plain text go through our Markdown parser.
 */
export function isVSCodeMarkdownPaste(clipboardData: DataTransfer): boolean {
  const raw = clipboardData.getData('vscode-editor-data');
  if (!raw) return false;
  try {
    const meta = JSON.parse(raw) as { mode?: string };
    return meta.mode === 'markdown';
  } catch {
    return false;
  }
}

const markdownParser = createMarkdownClipboardTextParser();

/**
 * When VSCode copies from a markdown file, it provides HTML that looks like
 * code-editor output (monospace, colored spans). ProseMirror prefers HTML,
 * so it interprets the content as a code block.
 *
 * This function intercepts that case: it reads `text/plain`, prevents default
 * HTML handling, and manually routes the text through our Markdown parse
 * pipeline.
 */
function handleVSCodeMarkdownPaste(
  view: EditorView,
  event: ClipboardEvent,
): boolean {
  const cd = event.clipboardData;
  if (!cd || !isVSCodeMarkdownPaste(cd)) return false;

  const text = cd.getData('text/plain');
  if (!text) return false;

  event.preventDefault();

  // Consume any pending paste intent so it doesn't leak
  const intent = consumeNextPasteIntent();
  const plain = intent === 'plain';

  const { state } = view;
  const slice = markdownParser(text, state.selection.$from, plain, view);
  view.dispatch(state.tr.replaceSelection(slice).scrollIntoView());

  return true;
}

export const createHandleDOMEvents = (handlePaste: PasteHandler) => ({
  paste: (view: EditorView, event: ClipboardEvent): boolean => {
    // Intercept VSCode markdown pastes before ProseMirror processes the HTML
    if (handleVSCodeMarkdownPaste(view, event)) {
      return true;
    }

    // Tiptap DOM event hooks run only after view is mounted, avoiding direct view.dom access.
    void handlePaste(event);
    return false;
  },
});
