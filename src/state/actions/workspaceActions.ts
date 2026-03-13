// src/state/actions/workspaceActions.ts
// V6 工作区事务协调器 - 带快照 - 回滚机制

import { FsSafety } from '../../services/fs/FsSafety';
import { FsService, type FolderPathResult } from '../../services/fs/FsService';
import { useEditorStore } from '../slices/editorSlice';
import { useFileTreeStore, type RootFolderNode } from '../slices/filetreeSlice';
import {
  useWorkspaceStore,
  type WorkspaceFolder,
} from '../slices/workspaceSlice';
import { WorkspaceStatePersistence } from '../../services/workspace/WorkspaceStatePersistence';

interface WorkspaceSnapshot {
  folders: WorkspaceFolder[];
  rootFolders: RootFolderNode[];
}

export type OpenFileResult =
  | { ok: true }
  | { ok: false; reason: 'active-flush-failed' | 'target-flush-failed' };

export type Result = { ok: true } | { ok: false; error: string };

export const workspaceActions = {
  // ========== 现有方法（兼容 V5）==========

  async openFile(path: string): Promise<OpenFileResult> {
    const { activeFile } = useWorkspaceStore.getState();

    if (activeFile) {
      const success = await FsSafety.flushAffectedFiles(activeFile);
      if (!success) return { ok: false, reason: 'active-flush-failed' };
    }

    if (path !== activeFile) {
      const success = await FsSafety.flushAffectedFiles(path);
      if (!success) return { ok: false, reason: 'target-flush-failed' };
    }

    const content = await FsService.readFile(path);
    useEditorStore.getState().initializeFile(path, content);
    useWorkspaceStore.getState().openFile(path);
    return { ok: true };
  },

  async loadWorkspace(path: string): Promise<number> {
    // V5 兼容：单文件夹模式
    useWorkspaceStore.setState({
      folders: [{ path, index: 0 }],
      workspaceFile: null,
      isDirty: false,
      openFiles: [],
      activeFile: null,
    });
    useEditorStore.setState({ fileStates: {} });

    const nodes = await FsService.listTree(path);
    useFileTreeStore.getState().setRootFolders([
      {
        workspacePath: path,
        displayName: path.split('/').pop() || path,
        tree: nodes,
      },
    ]);
    useFileTreeStore.getState().setSelectedPath(null);
    return nodes.length;
  },

  closeWorkspace(): void {
    useWorkspaceStore.setState({
      folders: [],
      workspaceFile: null,
      isDirty: false,
      openFiles: [],
      activeFile: null,
    });
    useEditorStore.setState({ fileStates: {} });
    useFileTreeStore.setState({
      rootFolders: [],
      expandedPaths: new Set(),
      selectedPath: null,
      loadingPaths: new Set(),
      errorPaths: new Map(),
      deletedPaths: new Set(),
    });
  },

  // ========== 多文件夹支持（带快照回滚）==========

  addFolderToWorkspace: async (folderPath: string): Promise<Result> => {
    // 1. 检查是否已存在
    const currentFolders = useWorkspaceStore.getState().folders;
    if (currentFolders.some((f) => f.path === folderPath)) {
      return { ok: false, error: 'Folder already exists' };
    }

    // 2. 预先验证和加载文件树
    const treeResult = await FsService.listTree(folderPath);

    // 3. 快照当前状态（用于回滚）
    const snapshot: WorkspaceSnapshot = {
      folders: useWorkspaceStore.getState().folders,
      rootFolders: useFileTreeStore.getState().rootFolders,
    };

    try {
      // 4. 构建新数据
      const newFolder: WorkspaceFolder = {
        path: folderPath,
        index: currentFolders.length,
      };
      const newRoot: RootFolderNode = {
        workspacePath: folderPath,
        displayName: folderPath.split('/').pop() || folderPath,
        tree: treeResult,
      };

      // 5. 批量更新
      useWorkspaceStore.getState().addFolder(newFolder);
      useFileTreeStore.getState().addRootFolder(newRoot);

      // 6. 标记 isDirty
      useWorkspaceStore.getState().setDirty(true);

      // 7. 持久化状态
      await WorkspaceStatePersistence.saveCurrentState();

      return { ok: true };
    } catch (error) {
      // 8. 回滚
      useWorkspaceStore.getState().restoreState({ folders: snapshot.folders });
      useFileTreeStore.getState().setRootFolders(snapshot.rootFolders);
      return { ok: false, error: String(error) };
    }
  },

  removeFolderFromWorkspace: async (folderPath: string): Promise<Result> => {
    // 1. 快照
    const snapshot: WorkspaceSnapshot = {
      folders: useWorkspaceStore.getState().folders,
      rootFolders: useFileTreeStore.getState().rootFolders,
    };

    try {
      // 2. 关闭该文件夹内已打开的文件
      const filesToClose = useWorkspaceStore
        .getState()
        .openFiles.filter((p) => p.startsWith(folderPath + '/'));

      for (const file of filesToClose) {
        useWorkspaceStore.getState().closeFile(file);
      }

      // 3. 更新状态
      useWorkspaceStore.getState().removeFolder(folderPath);
      useFileTreeStore.getState().removeRootFolder(folderPath);
      useWorkspaceStore.getState().setDirty(true);

      // 4. 持久化
      await WorkspaceStatePersistence.saveCurrentState();

      return { ok: true };
    } catch (error) {
      // 5. 回滚
      useWorkspaceStore.getState().restoreState({ folders: snapshot.folders });
      useFileTreeStore.getState().setRootFolders(snapshot.rootFolders);
      return { ok: false, error: String(error) };
    }
  },

  renameWorkspaceFolder: (folderPath: string, name: string): void => {
    useWorkspaceStore.getState().renameFolder(folderPath, name);
    useFileTreeStore.getState().updateRootFolderName(folderPath, name);
    useWorkspaceStore.getState().setDirty(true);
  },

  reorderFolders: (fromIndex: number, toIndex: number): void => {
    useWorkspaceStore.getState().reorderFolders(fromIndex, toIndex);
    // 同步更新 filetreeStore 的顺序
    const folders = useWorkspaceStore.getState().folders;
    const rootFolders = useFileTreeStore.getState().rootFolders;
    const reorderedRootFolders = folders
      .map((f) => rootFolders.find((r) => r.workspacePath === f.path))
      .filter((r): r is RootFolderNode => r !== undefined);
    useFileTreeStore.getState().setRootFolders(reorderedRootFolders);
  },

  moveRootFolderUp: (folderPath: string): void => {
    useWorkspaceStore.getState().moveFolderUp(folderPath);
    useFileTreeStore.getState().moveRootFolderUp(folderPath);
    useWorkspaceStore.getState().setDirty(true);
  },

  moveRootFolderDown: (folderPath: string): void => {
    useWorkspaceStore.getState().moveFolderDown(folderPath);
    useFileTreeStore.getState().moveRootFolderDown(folderPath);
    useWorkspaceStore.getState().setDirty(true);
  },

  moveNode: async (
    sourcePath: string,
    targetPath: string,
    dropPosition: 'inside' | 'above' | 'below',
  ): Promise<Result> => {
    try {
      // 获取源节点信息
      const rootFolders = useFileTreeStore.getState().rootFolders;
      let sourceRootPath: string | null = null;
      let targetRootPath: string | null = null;

      // 找到源和目标所属的根文件夹
      for (const folder of rootFolders) {
        if (
          sourcePath === folder.workspacePath ||
          sourcePath.startsWith(folder.workspacePath + '/')
        ) {
          sourceRootPath = folder.workspacePath;
        }
        if (
          targetPath === folder.workspacePath ||
          targetPath.startsWith(folder.workspacePath + '/')
        ) {
          targetRootPath = folder.workspacePath;
        }
      }

      if (!sourceRootPath || !targetRootPath) {
        return { ok: false, error: 'Invalid source or target path' };
      }

      // 不允许移动到自身或子节点
      if (
        sourcePath === targetPath ||
        targetPath.startsWith(sourcePath + '/')
      ) {
        return { ok: false, error: 'Cannot move to self or descendant' };
      }

      // 计算新路径
      const sourceName = sourcePath.split('/').pop() || '';
      let newParentPath: string;

      if (dropPosition === 'inside') {
        // 移动到文件夹内部
        newParentPath = targetPath;
      } else {
        // 移动到目标节点的上方或下方
        newParentPath =
          targetPath.substring(0, targetPath.lastIndexOf('/')) ||
          targetRootPath;
        // 注意：文件系统通常按字母排序，所以这里只是移动文件，排序由文件系统决定
      }

      const newPath = newParentPath
        ? `${newParentPath}/${sourceName}`
        : sourceName;

      // 检查是否需要实际移动（同目录不需要移动）
      const currentParentPath =
        sourcePath.substring(0, sourcePath.lastIndexOf('/')) || sourceRootPath;
      if (currentParentPath === newParentPath && dropPosition !== 'inside') {
        return { ok: true }; // 同目录，无需移动
      }

      // 刷新相关的文件
      await FsSafety.flushAffectedFiles(sourcePath);

      // 执行文件系统移动
      await FsService.renameNode(sourcePath, newPath);

      // 更新状态
      useWorkspaceStore.getState().renameFile(sourcePath, newPath);
      useEditorStore.getState().renameFile(sourcePath, newPath);

      // 刷新源和目标根文件夹的树
      if (sourceRootPath === targetRootPath) {
        const nodes = await FsService.listTree(sourceRootPath);
        useFileTreeStore.getState().setNodes(sourceRootPath, nodes);
      } else {
        // 跨根文件夹移动
        const sourceNodes = await FsService.listTree(sourceRootPath);
        const targetNodes = await FsService.listTree(targetRootPath);
        useFileTreeStore.getState().setNodes(sourceRootPath, sourceNodes);
        useFileTreeStore.getState().setNodes(targetRootPath, targetNodes);
      }

      // 更新选中路径
      useFileTreeStore.getState().setSelectedPath(newPath);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  },

  // ========== 工作区文件操作 ==========

  saveWorkspaceFile: async (savePath: string): Promise<Result> => {
    const state = useWorkspaceStore.getState();

    try {
      const config = {
        version: 1,
        folders: state.folders.map((f) => ({
          path: f.path,
          name: f.name,
        })),
        state: {
          openFiles: state.openFiles,
          activeFile: state.activeFile ?? undefined,
          sidebarVisible: true,
        },
      };

      await FsService.saveWorkspaceFile(savePath, config as any);
      useWorkspaceStore.getState().setWorkspaceFile(savePath);
      useWorkspaceStore.getState().setDirty(false);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  },

  loadWorkspaceFile: async (workspacePath: string): Promise<Result> => {
    try {
      const config = await FsService.parseWorkspaceFile(workspacePath);

      // 批量加载所有文件夹树
      const paths = config.folders.map((f: { path: string }) => f.path);
      const batchResult: FolderPathResult[] =
        await FsService.listTreeBatch(paths);

      const rootFolders: RootFolderNode[] = batchResult
        .filter((r: FolderPathResult) => r.error === undefined)
        .map((r: FolderPathResult, index: number) => ({
          workspacePath: r.path,
          displayName:
            config.folders[index]?.name || r.path.split('/').pop() || r.path,
          tree: r.nodes,
        }));

      // 原子更新所有 store
      useWorkspaceStore.getState().restoreState({
        folders: config.folders.map(
          (f: { path: string; name?: string }, i: number) => ({
            path: f.path,
            name: f.name,
            index: i,
          }),
        ),
        workspaceFile: workspacePath,
        isDirty: false,
        openFiles: config.state?.openFiles || [],
        activeFile: config.state?.activeFile || null,
      });

      useFileTreeStore.getState().setRootFolders(rootFolders);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  },
};
