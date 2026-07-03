import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const status = {
    setStatus: vi.fn(),
    markSaving: vi.fn(),
    markSaved: vi.fn(),
  };
  const editor = {
    fileStates: {} as Record<string, { content: string }>,
    setDirty: vi.fn(),
  };
  const workspace = {
    activeFile: null as string | null,
    closeFile: vi.fn(),
    folders: [] as string[],
    workspaceFile: null as string | null,
    isDirty: false,
    openFiles: [] as string[],
  };

  return {
    autosaveIsPending: vi.fn(() => false),
    autosaveFlush: vi.fn(() => Promise.resolve()),
    fsWriteFileAtomic: vi.fn(() => Promise.resolve()),
    status,
    editor,
    workspace,
  };
});

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
    isPending: mocks.autosaveIsPending,
    flush: mocks.autosaveFlush,
  },
}));

vi.mock('../../domains/file/services/FsService', () => ({
  FsService: {
    writeFileAtomic: mocks.fsWriteFileAtomic,
  },
}));

vi.mock('../../domains/editor/state/editorStore', () => ({
  useEditorStore: {
    getState: () => mocks.editor,
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
  useWorkspaceStore: { getState: () => mocks.workspace },
}));

vi.mock('../../state/slices/statusSlice', () => ({
  useStatusStore: { getState: () => mocks.status },
}));

vi.mock('../../shared/i18n', () => ({
  t: (key: string) => key,
}));

import { registerFileCommands } from './fileCommands';
import { menuCommandBus } from '../../ui/commands/menuCommandBus';

describe('fileCommands create behavior', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mocks.workspace.activeFile = null;
    mocks.editor.fileStates = {};
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

  it('flushes the pending autosave buffer when saving the active file', async () => {
    mocks.workspace.activeFile = '/tmp/current.md';
    mocks.editor.fileStates = {
      '/tmp/current.md': { content: 'pending content' },
    };
    mocks.autosaveIsPending.mockReturnValue(true);
    const unregister = registerFileCommands(vi.fn(), true, vi.fn(), vi.fn());

    expect(menuCommandBus.dispatch('menu.file.save')).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.status.markSaving).toHaveBeenCalledWith('/tmp/current.md');
    expect(mocks.autosaveFlush).toHaveBeenCalledWith('/tmp/current.md');
    expect(mocks.fsWriteFileAtomic).not.toHaveBeenCalled();

    unregister();
  });

  it('writes current content atomically and clears dirty state when no autosave is pending', async () => {
    let resolveWrite!: () => void;
    const writePromise = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    mocks.workspace.activeFile = '/tmp/current.md';
    mocks.editor.fileStates = {
      '/tmp/current.md': { content: '# Current content' },
    };
    mocks.autosaveIsPending.mockReturnValue(false);
    mocks.fsWriteFileAtomic.mockReturnValueOnce(writePromise);
    const unregister = registerFileCommands(vi.fn(), true, vi.fn(), vi.fn());

    expect(menuCommandBus.dispatch('menu.file.save')).toBe(true);
    await Promise.resolve();

    expect(mocks.status.markSaving).toHaveBeenCalledWith('/tmp/current.md');
    expect(mocks.fsWriteFileAtomic).toHaveBeenCalledWith(
      '/tmp/current.md',
      '# Current content',
    );
    expect(mocks.editor.setDirty).not.toHaveBeenCalled();
    expect(mocks.status.markSaved).not.toHaveBeenCalled();

    resolveWrite();
    await writePromise;
    await Promise.resolve();

    expect(mocks.editor.setDirty).toHaveBeenCalledWith(
      '/tmp/current.md',
      false,
    );
    expect(mocks.status.markSaved).toHaveBeenCalledWith('status.menu.saved');

    unregister();
  });
});
