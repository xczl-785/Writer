import { describe, expect, it } from 'vitest';
import { TOOLBAR_COMMANDS } from './constants';

describe('Toolbar shortcut conflicts', () => {
  it('does not contain duplicate non-empty shortcuts', () => {
    const shortcuts = TOOLBAR_COMMANDS.map(
      (command) => command.shortcut,
    ).filter((shortcut) => shortcut.trim().length > 0);
    const uniqueShortcuts = new Set(shortcuts);

    expect(uniqueShortcuts.size).toBe(shortcuts.length);
  });
});
