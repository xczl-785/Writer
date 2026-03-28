import {
  clearNextPasteIntent,
  type PasteIntent,
} from './pasteIntentController';

type SetStatus = (status: 'idle' | 'error', message: string) => void;

export function executePasteCommand(options: {
  intent?: PasteIntent;
  focusEditor: () => void;
  execDocumentCommand: (command: 'paste') => boolean;
  readClipboardText: () => Promise<string>;
  insertClipboardText: (text: string, intent: PasteIntent) => void;
  setStatus: SetStatus;
  clipboardDeniedMessage: string;
}): Promise<void> {
  const {
    intent = 'default',
    focusEditor,
    execDocumentCommand,
    readClipboardText,
    insertClipboardText,
    setStatus,
    clipboardDeniedMessage,
  } = options;

  focusEditor();
  clearNextPasteIntent();

  if (intent === 'default' && execDocumentCommand('paste')) {
    return Promise.resolve();
  }

  return readClipboardText()
    .then((text) => {
      insertClipboardText(text, intent);
    })
    .catch(() => {
      clearNextPasteIntent();
      setStatus('error', clipboardDeniedMessage);
    });
}
