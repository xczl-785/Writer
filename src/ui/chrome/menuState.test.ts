import { describe, expect, it } from 'vitest';
import {
  isMenuItemEnabledForState,
  type MenuRuntimeState,
} from './menuState';

const emptyState: MenuRuntimeState = {
  hasWorkspace: false,
  hasWorkspaceFile: false,
  hasActiveFile: false,
  hasDirtyActiveFile: false,
  hasRecentItems: false,
  isSidebarVisible: true,
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
      hasWorkspace: true,
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
  });

  it('enables recent-history actions only when recent items exist', () => {
    expect(
      isMenuItemEnabledForState('menu.file.open_recent', emptyState),
    ).toBe(false);
    expect(
      isMenuItemEnabledForState('menu.file.clear_recent', emptyState),
    ).toBe(false);

    const recentState: MenuRuntimeState = {
      ...emptyState,
      hasRecentItems: true,
    };

    expect(
      isMenuItemEnabledForState('menu.file.open_recent', recentState),
    ).toBe(true);
    expect(
      isMenuItemEnabledForState('menu.file.clear_recent', recentState),
    ).toBe(true);
  });

  it('keeps unsupported items disabled even when runtime state is otherwise valid', () => {
    const readyState: MenuRuntimeState = {
      hasWorkspace: true,
      hasWorkspaceFile: true,
      hasActiveFile: true,
      hasDirtyActiveFile: true,
      hasRecentItems: true,
      isSidebarVisible: true,
    };

    expect(
      isMenuItemEnabledForState('menu.file.export_pdf', readyState, false),
    ).toBe(false);
    expect(
      isMenuItemEnabledForState('menu.help.about', readyState, false),
    ).toBe(false);
  });
});
