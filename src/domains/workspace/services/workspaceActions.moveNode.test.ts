import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationStore } from '../../../state/slices/notificationSlice';

const mocks = vi.hoisted(() => {
  const fileTreeState = {
    rootFolders: [] as Array<{
      workspacePath: string;
      displayName: string;
      tree: unknown[];
    }>,
  };

  const fileTreeActions = {
    setNodes: vi.fn(),
    expandNode: vi.fn(),
    setSelectedPath: vi.fn(),
  };

  const workspaceActions = {
    renameFile: vi.fn(),
  };

  const editorActions = {
    renameFile: vi.fn(),
  };

  return {
    checkExists: vi.fn(),
    renameNode: vi.fn(),
    listTree: vi.fn(),
    flushAffectedFiles: vi.fn(),
    setStatus: vi.fn(),
    fileTreeState,
    fileTreeActions,
    workspaceActions,
    editorActions,
    reset() {
      fileTreeState.rootFolders = [];
      this.checkExists.mockReset();
      this.renameNode.mockReset();
      this.listTree.mockReset();
      this.flushAffectedFiles.mockReset();
      this.setStatus.mockReset();
      fileTreeActions.setNodes.mockReset();
      fileTreeActions.expandNode.mockReset();
      fileTreeActions.setSelectedPath.mockReset();
      workspaceActions.renameFile.mockReset();
      editorActions.renameFile.mockReset();
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
    checkExists: mocks.checkExists,
    renameNode: mocks.renameNode,
    listTree: mocks.listTree,
  },
}));

vi.mock('../../file/state/fileStore', () => ({
  useFileTreeStore: {
    getState: () => ({
      rootFolders: mocks.fileTreeState.rootFolders,
      ...mocks.fileTreeActions,
    }),
  },
}));

vi.mock('../state/workspaceStore', () => ({
  useWorkspaceStore: {
    getState: () => mocks.workspaceActions,
  },
}));

vi.mock('../../editor/state/editorStore', () => ({
  useEditorStore: {
    getState: () => mocks.editorActions,
  },
}));

vi.mock('../../../state/slices/statusSlice', () => ({
  useStatusStore: {
    getState: () => ({
      setStatus: mocks.setStatus,
    }),
  },
}));

vi.mock('./WorkspaceStatePersistence', () => ({
  WorkspaceStatePersistence: {
    saveCurrentState: vi.fn(),
  },
}));

vi.mock('../../../services/filewatcher', () => ({
  FileWatcherService: {},
}));

vi.mock('../../../ui/components/Dialog', () => ({
  showConfirmDialog: vi.fn(),
}));

vi.mock('../../../shared/i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('../../../types/WorkspaceErrors', () => ({
  createWorkspaceLoadError: vi.fn(),
  inferErrorType: vi.fn(),
}));

const { workspaceActions } = await import('./workspaceActions');

describe('workspaceActions.moveNode', () => {
  beforeEach(() => {
    mocks.reset();
    useNotificationStore.getState().clearNotifications();
    mocks.checkExists.mockResolvedValue(false);
    mocks.flushAffectedFiles.mockResolvedValue(true);
    mocks.renameNode.mockResolvedValue(undefined);
    mocks.listTree.mockResolvedValue([]);
  });

  it('matches workspace roots even when store paths use backslashes and drag paths use slashes', async () => {
    mocks.fileTreeState.rootFolders = [
      {
        workspacePath: 'E:\\Users\\29394\\Desktop\\Writer问题记录',
        displayName: 'Writer问题记录',
        tree: [],
      },
    ];

    const result = await workspaceActions.moveNode(
      'E:/Users/29394/Desktop/Writer问题记录/问题记录3.md',
      'E:/Users/29394/Desktop/Writer问题记录/测我是',
      'inside',
    );

    expect(result).toEqual({ ok: true });
    expect(mocks.renameNode).toHaveBeenCalledWith(
      'E:/Users/29394/Desktop/Writer问题记录/问题记录3.md',
      'E:/Users/29394/Desktop/Writer问题记录/测我是/问题记录3.md',
    );
    expect(mocks.fileTreeActions.setNodes).toHaveBeenCalledWith(
      'E:\\Users\\29394\\Desktop\\Writer问题记录',
      [],
    );
    expect(useNotificationStore.getState().level2Notification).toMatchObject({
      level: 'level2',
      tone: 'success',
      source: 'workspace-move',
      reason: 'move.success',
    });
  });

  it('derives sibling move targets with path helpers when target paths use backslashes', async () => {
    mocks.fileTreeState.rootFolders = [
      {
        workspacePath: 'E:\\Users\\29394\\Desktop\\Writer问题记录',
        displayName: 'Writer问题记录',
        tree: [],
      },
    ];

    const result = await workspaceActions.moveNode(
      'E:/Users/29394/Desktop/Writer问题记录/source.md',
      'E:\\Users\\29394\\Desktop\\Writer问题记录\\folder\\target.md',
      'above',
    );

    expect(result).toEqual({ ok: true });
    expect(mocks.renameNode).toHaveBeenCalledWith(
      'E:/Users/29394/Desktop/Writer问题记录/source.md',
      'E:/Users/29394/Desktop/Writer问题记录/folder/source.md',
    );
    expect(mocks.fileTreeActions.expandNode).toHaveBeenCalledWith(
      'E:/Users/29394/Desktop/Writer问题记录/folder',
    );
  });
});
