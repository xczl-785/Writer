export type PasteIntent = 'default' | 'plain';

let nextPasteIntent: PasteIntent = 'default';

export function setNextPasteIntent(intent: PasteIntent): void {
  nextPasteIntent = intent;
}

export function consumeNextPasteIntent(): PasteIntent {
  const intent = nextPasteIntent;
  nextPasteIntent = 'default';
  return intent;
}

export function clearNextPasteIntent(): void {
  nextPasteIntent = 'default';
}
