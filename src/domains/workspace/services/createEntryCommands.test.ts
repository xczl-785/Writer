import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canCreateFromWorkspace,
  dispatchCreateEntry,
  resolveCreateEntryExplorerCommand,
  resolveCreateEntryMenuTarget,
} from './createEntryCommands';

describe('createEntryCommands', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps file menu entries to sidebar create targets', () => {
    expect(resolveCreateEntryMenuTarget('menu.file.new')).toBe('new-file');
    expect(resolveCreateEntryMenuTarget('menu.file.new_folder')).toBe(
      'new-folder',
    );
    expect(resolveCreateEntryMenuTarget('menu.file.open_file')).toBeNull();
  });

  it('maps sidebar create targets to explorer commands', () => {
    expect(resolveCreateEntryExplorerCommand('new-file')).toBe(
      'explorer.newFile',
    );
    expect(resolveCreateEntryExplorerCommand('new-folder')).toBe(
      'explorer.newFolder',
    );
    expect(resolveCreateEntryExplorerCommand('unknown')).toBeNull();
  });

  it('derives create availability from current workspace path presence', () => {
    expect(canCreateFromWorkspace(null)).toBe(false);
    expect(canCreateFromWorkspace('')).toBe(false);
    expect(canCreateFromWorkspace('/workspace')).toBe(true);
  });

  it('shows sidebar first and dispatches create target after render when hidden', async () => {
    vi.useFakeTimers();

    const setIsSidebarVisible = vi.fn();
    const emit = vi.fn();

    dispatchCreateEntry({
      createTarget: 'new-file',
      isSidebarVisible: false,
      setIsSidebarVisible,
      emit,
    });

    expect(setIsSidebarVisible).toHaveBeenCalledWith(true);
    expect(emit).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(emit).toHaveBeenCalledWith('new-file');
  });

  it('dispatches immediately when sidebar is already visible', () => {
    const setIsSidebarVisible = vi.fn();
    const emit = vi.fn();

    dispatchCreateEntry({
      createTarget: 'new-folder',
      isSidebarVisible: true,
      setIsSidebarVisible,
      emit,
    });

    expect(setIsSidebarVisible).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('new-folder');
  });
});
