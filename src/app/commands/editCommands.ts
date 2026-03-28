/**
 * Edit menu commands
 *
 * Handles edit operations like undo, redo, cut, copy, paste, find, replace.
 */
import { menuCommandBus } from '../../ui/commands/menuCommandBus';

export type CleanupFn = () => void;

const emitEditorCommand = (id: string) => {
  window.dispatchEvent(
    new CustomEvent('writer:editor-command', { detail: { id } }),
  );
};

export function registerEditCommands(): CleanupFn {
  const cleanups: CleanupFn[] = [];

  cleanups.push(
    menuCommandBus.register('menu.edit.undo', () =>
      emitEditorCommand('edit.undo'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.edit.redo', () =>
      emitEditorCommand('edit.redo'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.edit.cut', () =>
      emitEditorCommand('edit.cut'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.edit.copy', () =>
      emitEditorCommand('edit.copy'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.edit.paste', () =>
      emitEditorCommand('edit.paste'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.edit.paste_plain', () =>
      emitEditorCommand('edit.paste_plain'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.edit.select_all', () =>
      emitEditorCommand('edit.select_all'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.edit.find', () =>
      emitEditorCommand('edit.find'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.edit.replace', () =>
      emitEditorCommand('edit.replace'),
    ),
  );

  return () => cleanups.forEach((fn) => fn());
}
