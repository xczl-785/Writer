/**
 * Format menu commands
 *
 * Handles text formatting operations like bold, italic, code, strike, link.
 */
import { menuCommandBus } from '../../ui/commands/menuCommandBus';

export type CleanupFn = () => void;

const emitEditorCommand = (id: string) => {
  window.dispatchEvent(
    new CustomEvent('writer:editor-command', { detail: { id } }),
  );
};

export function registerFormatCommands(): CleanupFn {
  const cleanups: CleanupFn[] = [];

  cleanups.push(
    menuCommandBus.register('menu.format.bold', () =>
      emitEditorCommand('format.bold'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.format.italic', () =>
      emitEditorCommand('format.italic'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.format.inline_code', () =>
      emitEditorCommand('format.inline_code'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.format.strike', () =>
      emitEditorCommand('format.strike'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.format.image', () =>
      emitEditorCommand('format.image'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.format.link', () =>
      emitEditorCommand('format.link'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.format.underline', () =>
      emitEditorCommand('format.underline'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.format.highlight', () =>
      emitEditorCommand('format.highlight'),
    ),
  );

  return () => cleanups.forEach((fn) => fn());
}
