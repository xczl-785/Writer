export function isSlashTriggerChar(value: string | null | undefined): boolean {
  return value === '/' || value === '／';
}

export function isInsertTextLikeInput(inputType: string): boolean {
  return inputType === 'insertText' || inputType === 'insertFromComposition';
}

