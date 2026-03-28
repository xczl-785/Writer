import { setNextPasteIntent, type PasteIntent } from './pasteIntentController';

type SetStatus = (status: 'idle' | 'error', message: string) => void;

export function executePasteCommand(options: {
  intent?: PasteIntent;
  focusEditor: () => void;
  execDocumentCommand: (command: 'paste') => boolean;
  setStatus: SetStatus;
  clipboardDeniedMessage: string;
}): void {
  const {
    intent = 'default',
    focusEditor,
    execDocumentCommand,
    setStatus,
    clipboardDeniedMessage,
  } = options;

  focusEditor();
  setNextPasteIntent(intent);

  if (execDocumentCommand('paste')) {
    return;
  }

  setNextPasteIntent('default');
  setStatus('error', clipboardDeniedMessage);
}
