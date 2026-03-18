import { describe, expect, it } from 'vitest';

import { isMenuItemEnabledForState } from './menuState';

describe('menuState create entry availability', () => {
  it('disables file create entries when no workspace context exists', () => {
    const state = {
      workspaceContext: 'none' as const,
      hasActiveFile: false,
      hasRecentItems: false,
      hasSelectedRootFolder: false,
    };

    expect(isMenuItemEnabledForState('menu.file.new', state)).toBe(false);
    expect(isMenuItemEnabledForState('menu.file.new_folder', state)).toBe(
      false,
    );
  });

  it('enables file create entries when a workspace context exists', () => {
    const state = {
      workspaceContext: 'single-temporary' as const,
      hasActiveFile: false,
      hasRecentItems: false,
      hasSelectedRootFolder: false,
    };

    expect(isMenuItemEnabledForState('menu.file.new', state)).toBe(true);
    expect(isMenuItemEnabledForState('menu.file.new_folder', state)).toBe(true);
  });
});
