/**
 * Help menu commands
 *
 * Handles help menu actions like opening About Writer.
 */
import { menuCommandBus } from '../../ui/commands/menuCommandBus';

export type CleanupFn = () => void;

export function registerHelpCommands(onOpenAbout: () => void): CleanupFn {
  const cleanups: CleanupFn[] = [];

  cleanups.push(
    menuCommandBus.register('menu.help.about', () => {
      onOpenAbout();
    }),
  );

  return () => cleanups.forEach((fn) => fn());
}
