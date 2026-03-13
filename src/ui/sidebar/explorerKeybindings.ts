import { EXPLORER_COMMANDS, type ExplorerCommandId } from './explorerCommands';

const isMacPlatform = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
};

export const matchExplorerShortcut = (
  event: KeyboardEvent,
): ExplorerCommandId | null => {
  const isMac = isMacPlatform();

  const key = event.key;
  const lowerKey = key.toLowerCase();
  const primary = isMac ? event.metaKey : event.ctrlKey;

  if (primary && lowerKey === 'n' && !event.shiftKey && !event.altKey) {
    return EXPLORER_COMMANDS.NEW_FILE;
  }

  if (primary && lowerKey === 'n' && event.shiftKey && !event.altKey) {
    return EXPLORER_COMMANDS.NEW_FOLDER;
  }

  if (!isMac && key === 'F2') {
    return EXPLORER_COMMANDS.RENAME;
  }

  if (isMac && key === 'Enter') {
    return EXPLORER_COMMANDS.RENAME;
  }

  if (!isMac && key === 'Delete') {
    return EXPLORER_COMMANDS.DELETE;
  }

  if (isMac && ((event.metaKey && key === 'Backspace') || key === 'Delete')) {
    return EXPLORER_COMMANDS.DELETE;
  }

  // Cmd/Ctrl + Shift + Arrow Up/Down for reordering root folders
  if (primary && event.shiftKey && key === 'ArrowUp' && !event.altKey) {
    return EXPLORER_COMMANDS.MOVE_UP;
  }

  if (primary && event.shiftKey && key === 'ArrowDown' && !event.altKey) {
    return EXPLORER_COMMANDS.MOVE_DOWN;
  }

  return null;
};
