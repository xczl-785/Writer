import {
  clearNextPasteIntent,
  type PasteIntent,
} from './pasteIntentController';
import type { ClipboardPayload } from '../../../services/runtime/ClipboardTextReader';

type SetStatus = (status: 'idle' | 'error', message: string) => void;

export function executePasteCommand(options: {
  intent?: PasteIntent;
  focusEditor: () => void;
  execDocumentCommand: (command: 'paste') => boolean;
  readClipboardPayload: () => Promise<ClipboardPayload>;
  insertClipboardText: (text: string, intent: PasteIntent) => void;
  insertClipboardHtml: (html: string) => void;
  setStatus: SetStatus;
  clipboardDeniedMessage: string;
}): Promise<void> {
  const {
    intent = 'default',
    focusEditor,
    execDocumentCommand,
    readClipboardPayload,
    insertClipboardText,
    insertClipboardHtml,
    setStatus,
    clipboardDeniedMessage,
  } = options;

  focusEditor();
  clearNextPasteIntent();

  if (intent === 'default' && execDocumentCommand('paste')) {
    return Promise.resolve();
  }

  return readClipboardPayload()
    .then((payload) => {
      if (intent === 'plain') {
        if (payload.text !== null) {
          insertClipboardText(payload.text, 'plain');
          return;
        }
        throw new Error('Clipboard text unavailable');
      }

      if (payload.html !== null) {
        insertClipboardHtml(payload.html);
        return;
      }

      if (payload.text !== null) {
        insertClipboardText(payload.text, 'default');
        return;
      }

      throw new Error('Clipboard payload unavailable');
    })
    .catch(() => {
      clearNextPasteIntent();
      setStatus('error', clipboardDeniedMessage);
    });
}
