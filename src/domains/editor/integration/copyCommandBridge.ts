/**
 * Copy command bridge — implements the two explicit copy entry points:
 *
 *  - `executeCopyAsMarkdown`: forces the current selection onto the
 *    clipboard as Markdown source, writing both `text/plain` (source)
 *    and `text/html` (rendered markup) so pasting into Word / Gmail /
 *    Notion still produces rich text.
 *  - `executeCopyAsPlainText`: forces plain text onto the clipboard
 *    and deliberately does NOT write `text/html` — this is the escape
 *    hatch when the user wants rich paste targets to receive plain
 *    text too (capability markdown-clipboard CR-016).
 *
 * Both commands bypass the "smart" whitelist that drives the default
 * Ctrl+C path (`clipboardTextSerializer`). They are the named
 * overrides when the default routing is not what the user wants.
 */
import { DOMSerializer, Fragment, Slice } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';
import {
  serializeSliceAsMarkdown,
  serializeSliceAsPlainText,
} from './smartClipboardSerializer';
import { ErrorService } from '../../../services/error/ErrorService';

/**
 * Returns the current selection as a slice. If the selection is
 * empty (cursor-only) the entire document is returned instead — this
 * is the intuitive "copy the whole thing" semantic used by the
 * context menu entries, which currently fires only on empty
 * selections.
 */
function selectionSlice(editor: Editor): Slice {
  const { selection, doc } = editor.state;
  if (selection.empty) {
    return new Slice(doc.content, 0, 0);
  }
  return selection.content();
}

function sliceToHtml(editor: Editor, fragment: Fragment): string {
  const serializer = DOMSerializer.fromSchema(editor.schema);
  const domFragment = serializer.serializeFragment(fragment);
  const container = document.createElement('div');
  container.appendChild(domFragment);
  return container.innerHTML;
}

async function writeClipboard(
  entries: Array<{ mime: string; value: string }>,
  errorContext: string,
): Promise<void> {
  const clipboard = navigator.clipboard;
  if (!clipboard) {
    ErrorService.handle(
      new Error('navigator.clipboard unavailable'),
      errorContext,
    );
    return;
  }

  // Prefer the multi-MIME `write` API when available so rich targets
  // can opt into text/html while plain targets fall back to text/plain.
  const hasClipboardItem =
    typeof window !== 'undefined' && 'ClipboardItem' in window;
  if (hasClipboardItem && clipboard.write) {
    try {
      const payload: Record<string, Blob> = {};
      for (const { mime, value } of entries) {
        payload[mime] = new Blob([value], { type: mime });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = new (window as any).ClipboardItem(payload);
      await clipboard.write([item]);
      return;
    } catch (error) {
      // Fall through to writeText fallback below.
      ErrorService.log(error, errorContext);
    }
  }

  const plain = entries.find((entry) => entry.mime === 'text/plain');
  if (plain && clipboard.writeText) {
    try {
      await clipboard.writeText(plain.value);
      return;
    } catch (error) {
      ErrorService.handle(error, errorContext);
      return;
    }
  }

  ErrorService.handle(new Error('No usable clipboard API'), errorContext);
}

export async function executeCopyAsMarkdown(editor: Editor): Promise<void> {
  const slice = selectionSlice(editor);
  if (slice.size === 0) return;
  const markdown = serializeSliceAsMarkdown(slice);
  const html = sliceToHtml(editor, slice.content);
  await writeClipboard(
    [
      { mime: 'text/plain', value: markdown },
      { mime: 'text/html', value: html },
    ],
    'Failed to copy as Markdown',
  );
}

export async function executeCopyAsPlainText(editor: Editor): Promise<void> {
  const slice = selectionSlice(editor);
  if (slice.size === 0) return;
  const plain = serializeSliceAsPlainText(slice);
  await writeClipboard(
    [{ mime: 'text/plain', value: plain }],
    'Failed to copy as plain text',
  );
}
