import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileNode } from '../../../state/types';

const mocks = vi.hoisted(() => {
  const listTree = vi.fn();
  const startWatching = vi.fn();
  const stopWatching = vi.fn();
  const updateWatchPaths = vi.fn();
  const flushAffectedFiles = vi.fn();
  const saveCurrentState = vi.fn();
  const showConfirmDialog = vi.fn();

  let watcherCallback:
    | ((event: { type: string; path: string; oldPath?: string }) => Promise<void>)
    | undefined;

  const fileTreeState = {
    rootFolders: [] as Array<{
      workspacePath: string;
      displayName: string;
      tree: FileNode[];
    }>,
    expandedPaths: new Set<string>(),
    selectedPath: null as string | null,
    loadingPaths: new Set<string>(),
    errorPaths: new Map<string, string>(),
    deletedPaths: new Set<string>(),
  };

  const workspaceState = {
    folders: [] as Array<{ path: string; index: number; name?: string }>,
    workspaceFile: null as string | null,
    isDirty: false,
    openFiles: [] as string[],
    activeFile: null as string | null,
  };

  const editorState = {
    fileStates: {} as Record<string, { isDirty: boolean }>,
  };

  const fileTreeActions = {
    setRootFolders: vi.fn((folders: typeof fileTreeState.rootFolders) => {
      fileTreeState.rootFolders = folders;
    }),
    addRootFolder: vi.fn(),
    removeRootFolder: vi.fn((path: string) => {
      fileTreeState.rootFolders = fileTreeState.rootFolders.filter(
        (folder) => folder.workspacePath !== path,
      );
    }),
    moveRootFolderUp: vi.fn(),
    moveRootFolderDown: vi.fn(),
    setNodes: vi.fn((path: string, nodes: FileNode[]) => {
      fileTreeState.rootFolders = fileTreeState.rootFolders.map((folder) =>
        folder.workspacePath === path ? { ...folder, tree: nodes } : folder,
      );
    }),
    setSelectedPath: vi.fn((path: string | null) => {
      fileTreeState.selectedPath = path;
    }),
    expandNode: vi.fn(),
    collapseNode: vi.fn(),
    toggleNode: vi.fn(),
    setLoadingPath: vi.fn(),
    setErrorPath: vi.fn(),
    markAsDeleted: vi.fn((path: string) => {
      fileTreeState.deletedPaths.add(path);
    }),
    clearDeletedPath: vi.fn(),
    clearState: vi.fn(),
  };

  const workspaceActions = {
    addFolder: vi.fn(),
    removeFolder: vi.fn((path: string) => {
      workspaceState.folders = workspaceState.folders.filter(
        (folder) => folder.path !== path,
      );
    }),
    reorderFolders: vi.fn(),
    moveFolderUp: vi.fn(),
    moveFolderDown: vi.fn(),
    openFile: vi.fn(),
    closeFile: vi.fn(),
    setActiveFile: vi.fn(),
    renameFile: vi.fn(),
    removePath: vi.fn(),
    restoreState: vi.fn(),
    clearState: vi.fn(),
    setWorkspaceFile: vi.fn(),
    setDirty: vi.fn(),
  };

  const fileTreeStore = Object.assign(
    () => ({ ...fileTreeState, ...fileTreeActions }),
    {
      getState: () => ({ ...fileTreeState, ...fileTreeActions }),
      setState: (
        update:
          | Partial<typeof fileTreeState>
          | ((state: typeof fileTreeState) => Partial<typeof fileTreeState>),
      ) => {
        const partial =
          typeof update === 'function' ? update(fileTreeState) : update;
        Object.assign(fileTreeState, partial);
      },
    },
  );

  const workspaceStore = Object.assign(
    () => ({ ...workspaceState, ...workspaceActions }),
    {
      getState: () => ({ ...workspaceState, ...workspaceActions }),
      setState: (partial: Partial<typeof workspaceState>) => {
        Object.assign(workspaceState, partial);
      },
    },
  );

  const editorStore = Object.assign(
    () => ({ ...editorState }),
    {
      getState: () => ({
        ...editorState,
        initializeFile: vi.fn(),
        renameFile: vi.fn(),
        removePath: vi.fn(),
      }),
      setState: (partial: Partial<typeof editorState>) => {
        Object.assign(editorState, partial);
      },
    },
  );

  return {
    listTree,
    startWatching,
    stopWatching,
    updateWatchPaths,
    flushAffectedFiles,
    saveCurrentState,
    showConfirmDialog,
    fileTreeState,
    workspaceState,
    fileTreeActions,
    workspaceActions,
    fileTreeStore,
    workspaceStore,
    editorStore,
    setWatcherCallback: (
      callback: (event: {
        type: string;
        path: string;
        oldPath?: string;
      }) => Promise<void>,
    ) => {
      watcherCallback = callback;
    },
    getWatcherCallback: () => watcherCallback,
    attachWatcherImplementation: () => {
      startWatching.mockImplementation(
        async (
          _paths: string[],
          callback: (event: {
            type: string;
            path: string;
            oldPath?: string;
          }) => Promise<void>,
        ) => {
          watcherCallback = callback;
        },
      );
    },
    resetState: () => {
      watcherCallback = undefined;
      fileTreeState.rootFolders = [];
      fileTreeState.expandedPaths = new Set<string>();
      fileTreeState.selectedPath = null;
      fileTreeState.loadingPaths = new Set<string>();
      fileTreeState.errorPaths = new Map<string, string>();
      fileTreeState.deletedPaths = new Set<string>();
      workspaceState.folders = [];
      workspaceState.workspaceFile = null;
      workspaceState.isDirty = false;
      workspaceState.openFiles = [];
      workspaceState.activeFile = null;
      editorState.fileStates = {};
      listTree.mockReset();
      startWatching.mockReset();
      stopWatching.mockReset();
      updateWatchPaths.mockReset();
      flushAffectedFiles.mockReset();
      saveCurrentState.mockReset();
      showConfirmDialog.mockReset();
      Object.values(fileTreeActions).forEach((mock) => mock.mockClear());
      Object.values(workspaceActions).forEach((mock) => mock.mockClear());
      startWatching.mockReset();
      stopWatching.mockReset();
      updateWatchPaths.mockReset();
      flushAffectedFiles.mockReset();
      saveCurrentState.mockReset();
      showConfirmDialog.mockReset();
      Object.values(fileTreeActions).forEach((mock) => mock.mockClear());
      Object.values(workspaceActions).forEach((mock) => mock.mockClear());
      startWatching.mockImplementation(
        async (
          _paths: string[],
          callback: (event: {
            type: string;
            path: string;
            oldPath?: string;
          }) => Promise<void>,
        ) => {
          watcherCallback = callback;
        },
      );
    },
  };
});

vi.mock('../../file/services/FsSafety', () => ({
  FsSafety: {
    flushAffectedFiles: mocks.flushAffectedFiles,
  },
}));

vi.mock('../../file/services/FsService', () => ({
  FsService: {
    listTree: mocks.listTree,
  },
}));

vi.mock('../../editor/state/editorStore', () => ({
  useEditorStore: mocks.editorStore,
}));

vi.mock('../../file/state/fileStore', () => ({
  useFileTreeStore: mocks.fileTreeStore,
}));

vi.mock('../state/workspaceStore', () => ({
  useWorkspaceStore: mocks.workspaceStore,
}));

vi.mock('../../../state/slices/statusSlice', () => ({
  useStatusStore: {
    getState: () => ({
      setStatus: vi.fn(),
    }),
  },
}));

vi.mock('./WorkspaceStatePersistence', () => ({
  WorkspaceStatePersistence: {
    saveCurrentState: mocks.saveCurrentState,
  },
}));

vi.mock('../../../services/filewatcher', () => ({
  FileWatcherService: {
    startWatching: mocks.startWatching,
    stopWatching: mocks.stopWatching,
    updateWatchPaths: mocks.updateWatchPaths,
  },
}));

vi.mock('../../../utils/pathUtils', async () => {
  const actual = await vi.importActual('../../../utils/pathUtils');
  return actual;
});

vi.mock('../../../ui/components/Dialog', () => ({
  showConfirmDialog: mocks.showConfirmDialog,
}));

vi.mock('../../../shared/i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('../../../types/WorkspaceErrors', () => ({
  createWorkspaceLoadError: vi.fn(),
  inferErrorType: vi.fn(),
}));

const { workspaceActions } = await import('./workspaceActions');

describe('workspace watcher refresh behavior', () => {
  const initialNodes: FileNode[] = [
    {
      path: 'E:/workspace/docs',
      name: 'docs',
      type: 'directory',
      children: [],
    },
  ];
  const refreshedNodes: FileNode[] = [];

  beforeEach(() => {
    mocks.resetState();
    mocks.attachWatcherImplementation();
  });

  it('refreshes the file tree when a watched child path is reported with Windows separators', async () => {
    mocks.listTree.mockResolvedValueOnce(initialNodes).mockResolvedValueOnce(
      refreshedNodes,
    );

    await workspaceActions.loadWorkspace('E:/workspace');

    const onChange = mocks.getWatcherCallback();
    expect(onChange).toBeTypeOf('function');

    await onChange?.({
      type: 'unlink',
      path: 'E:\\workspace\\docs\\note.md',
    });

    expect(mocks.listTree).toHaveBeenNthCalledWith(2, 'E:/workspace');
    expect(mocks.fileTreeActions.setNodes).toHaveBeenCalledWith(
      'E:/workspace',
      refreshedNodes,
    );
    expect(mocks.fileTreeActions.markAsDeleted).toHaveBeenCalledWith(
      'E:\\workspace\\docs\\note.md',
    );
  });

  it('removes a workspace root when the root folder itself is deleted externally', async () => {
    mocks.listTree
      .mockResolvedValueOnce(initialNodes)
      .mockRejectedValueOnce(new Error('Path does not exist: E:/workspace'));
    mocks.fileTreeState.expandedPaths = new Set(['E:/workspace']);
    mocks.fileTreeState.selectedPath = 'E:/workspace/docs/note.md';
    mocks.workspaceState.openFiles = ['E:/workspace/docs/note.md'];
    mocks.workspaceState.activeFile = 'E:/workspace/docs/note.md';

    await workspaceActions.loadWorkspace('E:/workspace');

    const onChange = mocks.getWatcherCallback();
    expect(onChange).toBeTypeOf('function');

    await onChange?.({
      type: 'unlink',
      path: 'E:/workspace',
    });

    expect(mocks.workspaceActions.removeFolder).toHaveBeenCalledWith(
      'E:/workspace',
    );
    expect(mocks.fileTreeActions.removeRootFolder).toHaveBeenCalledWith(
      'E:/workspace',
    );
    expect(mocks.workspaceActions.removePath).toHaveBeenCalledWith(
      'E:/workspace',
    );
    expect(mocks.fileTreeActions.setSelectedPath).toHaveBeenCalledWith(null);
    expect(mocks.stopWatching).toHaveBeenCalledTimes(1);
    expect(mocks.fileTreeState.expandedPaths.has('E:/workspace')).toBe(false);
  });

  it('keeps explicit workspace root removal behavior while using the same detach side effects', async () => {
    mocks.workspaceState.folders = [{ path: 'E:/workspace', index: 0 }];
    mocks.workspaceState.openFiles = ['E:/workspace/docs/note.md'];
    mocks.workspaceState.activeFile = 'E:/workspace/docs/note.md';
    mocks.fileTreeState.rootFolders = [
      {
        workspacePath: 'E:/workspace',
        displayName: 'workspace',
        tree: initialNodes,
      },
    ];
    mocks.fileTreeState.expandedPaths = new Set(['E:/workspace']);
    mocks.fileTreeState.selectedPath = 'E:/workspace/docs/note.md';

    const result = await workspaceActions.removeFolderFromWorkspace(
      'E:/workspace',
    );

    expect(result).toEqual({ ok: true });
    expect(mocks.workspaceActions.removeFolder).toHaveBeenCalledWith(
      'E:/workspace',
    );
    expect(mocks.fileTreeActions.removeRootFolder).toHaveBeenCalledWith(
      'E:/workspace',
    );
    expect(mocks.workspaceActions.setDirty).toHaveBeenCalledWith(true);
    expect(mocks.saveCurrentState).toHaveBeenCalledTimes(1);
    expect(mocks.stopWatching).toHaveBeenCalledTimes(1);
    expect(mocks.fileTreeState.expandedPaths.has('E:/workspace')).toBe(false);
  });
});
