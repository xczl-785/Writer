import { describe, expect, it } from 'vitest';
import {
  isMenuItemEnabledForState,
  type MenuRuntimeState,
} from './menuState';

const emptyState: MenuRuntimeState = {
  workspaceContext: 'none',
  hasActiveFile: false,
  hasRecentItems: false,
  hasSelectedRootFolder: false,
};

describe('menuState', () => {
  it('disables workspace-scoped file actions when no workspace is open', () => {
    expect(isMenuItemEnabledForState('menu.file.close_folder', emptyState)).toBe(
      false,
    );
    expect(
      isMenuItemEnabledForState('menu.file.save_workspace', emptyState),
    ).toBe(false);
    expect(
      isMenuItemEnabledForState('menu.file.save_workspace_as', emptyState),
    ).toBe(false);
    expect(isMenuItemEnabledForState('menu.file.close_file', emptyState)).toBe(
      false,
    );
    expect(
      isMenuItemEnabledForState(
        'menu.file.add_folder_to_workspace',
        emptyState,
      ),
    ).toBe(false);
  });

  it('enables editor-scoped actions only when there is an active file', () => {
    expect(isMenuItemEnabledForState('menu.edit.undo', emptyState)).toBe(false);
    expect(
      isMenuItemEnabledForState('menu.format.bold', emptyState),
    ).toBe(false);
    expect(
      isMenuItemEnabledForState('menu.paragraph.blockquote', emptyState),
    ).toBe(false);

    const activeFileState: MenuRuntimeState = {
      ...emptyState,
      workspaceContext: 'single-temporary',
      hasActiveFile: true,
    };

    expect(isMenuItemEnabledForState('menu.edit.undo', activeFileState)).toBe(
      true,
    );
    expect(
      isMenuItemEnabledForState('menu.format.bold', activeFileState),
    ).toBe(true);
    expect(
      isMenuItemEnabledForState('menu.paragraph.blockquote', activeFileState),
    ).toBe(true);
    expect(
      isMenuItemEnabledForState('menu.file.close_file', activeFileState),
    ).toBe(true);
  });

  it('enables recent-history actions only when recent items exist', () => {
    expect(
      isMenuItemEnabledForState('menu.file.open_recent', emptyState),
    ).toBe(false);

    const recentState: MenuRuntimeState = {
      ...emptyState,
      hasRecentItems: true,
    };

    expect(
      isMenuItemEnabledForState('menu.file.open_recent', recentState),
    ).toBe(true);
  });

  it('allows workspace save actions for an empty saved workspace while keeping close-folder disabled', () => {
    const emptySavedWorkspaceState: MenuRuntimeState = {
      ...emptyState,
      workspaceContext: 'saved-empty',
    };

    expect(
      isMenuItemEnabledForState(
        'menu.file.add_folder_to_workspace',
        emptySavedWorkspaceState,
      ),
    ).toBe(true);
    expect(
      isMenuItemEnabledForState(
        'menu.file.save_workspace',
        emptySavedWorkspaceState,
      ),
    ).toBe(true);
    expect(
      isMenuItemEnabledForState(
        'menu.file.save_workspace_as',
        emptySavedWorkspaceState,
      ),
    ).toBe(true);
    expect(
      isMenuItemEnabledForState(
        'menu.file.close_workspace',
        emptySavedWorkspaceState,
      ),
    ).toBe(true);
    expect(
      isMenuItemEnabledForState(
        'menu.file.close_folder',
        emptySavedWorkspaceState,
      ),
    ).toBe(false);
  });

  it('requires an explicitly selected root folder before enabling close-folder', () => {
    const multiWorkspaceState: MenuRuntimeState = {
      ...emptyState,
      workspaceContext: 'multi-unsaved',
    };

    expect(
      isMenuItemEnabledForState('menu.file.close_folder', multiWorkspaceState),
    ).toBe(false);
    expect(
      isMenuItemEnabledForState('menu.file.close_folder', {
        ...multiWorkspaceState,
        hasSelectedRootFolder: true,
      }),
    ).toBe(true);
  });

  it('keeps unsupported items disabled even when runtime state is otherwise valid', () => {
    const readyState: MenuRuntimeState = {
      workspaceContext: 'saved',
      hasActiveFile: true,
      hasRecentItems: true,
      hasSelectedRootFolder: true,
    };

    expect(
      isMenuItemEnabledForState('menu.file.export_pdf', readyState, false),
    ).toBe(false);
    expect(
      isMenuItemEnabledForState('menu.help.about', readyState, false),
    ).toBe(false);
  });
});
