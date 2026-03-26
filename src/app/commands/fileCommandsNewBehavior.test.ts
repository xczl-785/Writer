import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ close: vi.fn(() => Promise.resolve()) }),
}));

vi.mock('../../domains/file/state/fileStore', () => ({
  useFileTreeStore: {
    getState: () => ({ selectedPath: null, rootFolders: [] }),
  },
}));

vi.mock('../../domains/file/services/AutosaveService', () => ({
  AutosaveService: {
    isPending: vi.fn(() => false),
    flush: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../domains/file/services/FsService', () => ({
  FsService: {
    writeFileAtomic: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../domains/editor/state/editorStore', () => ({
  useEditorStore: {
    getState: () => ({ fileStates: {}, setDirty: vi.fn() }),
  },
}));

vi.mock('../../domains/workspace/services/workspaceActions', () => ({
  workspaceActions: {
    removeFolderFromWorkspace: vi.fn(() => Promise.resolve({ ok: true })),
    closeWorkspace: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../domains/workspace/services/WorkspaceManager', () => ({
  addFolderToWorkspaceByDialog: vi.fn(() => Promise.resolve()),
  openFileWithDialog: vi.fn(() => Promise.resolve()),
  openWorkspace: vi.fn(() => Promise.resolve()),
  openWorkspaceFile: vi.fn(() => Promise.resolve()),
  saveCurrentWorkspace: vi.fn(() => Promise.resolve()),
  saveWorkspaceFileByDialog: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../domains/workspace/state/workspaceStore', () => ({
  getWorkspaceContext: vi.fn(() => 'folder'),
  useWorkspaceStore: {
    getState: () => ({
      activeFile: null,
      closeFile: vi.fn(),
      folders: [],
      workspaceFile: null,
      isDirty: false,
      openFiles: [],
    }),
  },
}));

vi.mock('../../state/slices/statusSlice', () => ({
  useStatusStore: {
    getState: () => ({
      setStatus: vi.fn(),
      markSaving: vi.fn(),
      markSaved: vi.fn(),
    }),
  },
}));

vi.mock('../../shared/i18n', () => ({
  t: (key: string) => key,
}));

import { registerFileCommands } from './fileCommands';
import { menuCommandBus } from '../../ui/commands/menuCommandBus';

describe('fileCommands create behavior', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('dispatches the sidebar create command after the sidebar becomes visible', async () => {
    vi.useFakeTimers();

    const setIsSidebarVisible = vi.fn();
    const unregister = registerFileCommands(
      setIsSidebarVisible,
      false,
      vi.fn(),
      vi.fn(),
    );

    const received = vi.fn();

    expect(menuCommandBus.dispatch('menu.file.new')).toBe(true);
    window.addEventListener(
      'writer:sidebar-command',
      received as EventListener,
    );

    await vi.runAllTimersAsync();

    expect(setIsSidebarVisible).toHaveBeenCalledWith(true);
    expect(received).toHaveBeenCalledTimes(1);
    expect(
      (received.mock.calls[0][0] as CustomEvent<{ id: string }>).detail.id,
    ).toBe('new-file');

    window.removeEventListener(
      'writer:sidebar-command',
      received as EventListener,
    );
    unregister();
  });

  it('dispatches the sidebar new-folder command after the sidebar becomes visible', async () => {
    vi.useFakeTimers();

    const setIsSidebarVisible = vi.fn();
    const unregister = registerFileCommands(
      setIsSidebarVisible,
      false,
      vi.fn(),
      vi.fn(),
    );

    const received = vi.fn();

    expect(menuCommandBus.dispatch('menu.file.new_folder')).toBe(true);
    window.addEventListener(
      'writer:sidebar-command',
      received as EventListener,
    );

    await vi.runAllTimersAsync();

    expect(setIsSidebarVisible).toHaveBeenCalledWith(true);
    expect(received).toHaveBeenCalledTimes(1);
    expect(
      (received.mock.calls[0][0] as CustomEvent<{ id: string }>).detail.id,
    ).toBe('new-folder');

    window.removeEventListener(
      'writer:sidebar-command',
      received as EventListener,
    );
    unregister();
  });
});
