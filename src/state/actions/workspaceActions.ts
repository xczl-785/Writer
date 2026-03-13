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
import { useStatusStore } from '../slices/statusSlice';
import { WorkspaceStatePersistence } from '../../services/workspace/WorkspaceStatePersistence';
import { FileWatcherService } from '../../services/filewatcher';
import type { FileChangeEvent } from '../../services/filewatcher';
import { getRelativePath, resolvePath } from '../../utils/pathUtils';
import { showConfirmDialog } from '../../ui/components/Dialog';
import { t } from '../../i18n';
import {
  type WorkspaceLoadResult,
  createWorkspaceLoadError,
  inferErrorType,
} from '../../types/WorkspaceErrors';

interface WorkspaceSnapshot {
  folders: WorkspaceFolder[];
  rootFolders: RootFolderNode[];
}

export type OpenFileResult =
  | { ok: true }
  | { ok: false; reason: 'active-flush-failed' | 'target-flush-failed' };

export type Result = { ok: true } | { ok: false; error: string };

export type CloseWorkspaceResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'save-failed' };

/**
 * 获取所有脏文件路径
 */
function getDirtyFiles(): string[] {
  const { fileStates } = useEditorStore.getState();
  return Object.entries(fileStates)
    .filter(([, state]) => state.isDirty)
    .map(([path]) => path);
}

/**
 * 保存所有脏文件
 */
async function saveAllDirtyFiles(dirtyFiles: string[]): Promise<boolean> {
  try {
    // 先刷新所有待保存的内容
    for (const path of dirtyFiles) {
      await FsSafety.flushAffectedFiles(path);
    }
    return true;
  } catch (error) {
    console.error('Failed to save dirty files:', error);
    return false;
  }
}

/**
 * 清空工作区状态
 */
function clearWorkspaceState(): void {
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
}

/**
 * 处理文件变化事件（来自 FileWatcherService）
 */
async function handleFileChange(event: FileChangeEvent): Promise<void> {
  const rootFolders = useFileTreeStore.getState().rootFolders;

  // 找到变化文件所属的根文件夹
  const affectedRoot = rootFolders.find(
    (folder) =>
      event.path === folder.workspacePath ||
      event.path.startsWith(folder.workspacePath + '/'),
  );

  if (!affectedRoot) return;

  // 刷新受影响的根文件夹树
  try {
    const refreshedNodes = await FsService.listTree(affectedRoot.workspacePath);
    useFileTreeStore
      .getState()
      .setNodes(affectedRoot.workspacePath, refreshedNodes);

    // 如果是删除事件，标记删除
    if (event.type === 'unlink' || event.type === 'unlinkDir') {
      useFileTreeStore.getState().markAsDeleted(event.path);
    }
  } catch (error) {
    console.error('Failed to refresh file tree:', error);
  }
}

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

    // 启动文件监听
    await FileWatcherService.startWatching([path], handleFileChange);

    return nodes.length;
  },

  /**
   * 关闭工作区
   *
   * @param forceClose - 是否强制关闭（跳过未保存文件检查）
   * @returns 关闭结果
   */
  async closeWorkspace(forceClose = false): Promise<CloseWorkspaceResult> {
    const dirtyFiles = getDirtyFiles();

    // 如果有脏文件且非强制关闭，显示确认对话框
    if (dirtyFiles.length > 0 && !forceClose) {
      const message = t('workspace.closeDirtyMessage').replace(
        '{count}',
        String(dirtyFiles.length),
      );
      const description = t('workspace.closeDirtyDescription');

      const confirmed = await showConfirmDialog({
        title: t('workspace.closeTitle'),
        message,
        description,
        okLabel: t('workspace.saveAndClose'),
        cancelLabel: t('workspace.closeWithoutSave'),
        kind: 'warning',
      });

      if (!confirmed) {
        // 用户选择不保存关闭 - 直接清空状态
        clearWorkspaceState();
        return { ok: true };
      }

      // 用户选择保存并关闭
      useStatusStore.getState().setStatus('saving', t('workspace.closing'));

      const saveSuccess = await saveAllDirtyFiles(dirtyFiles);
      if (!saveSuccess) {
        useStatusStore.getState().setStatus('error', t('status.saveFailed'));
        return { ok: false, reason: 'save-failed' };
      }
    }

    // 设置状态栏提示
    useStatusStore.getState().setStatus('loading', t('workspace.closing'));

    // 停止文件监听
    await FileWatcherService.stopWatching();

    // 清空状态
    clearWorkspaceState();

    // 重置状态栏
    useStatusStore.getState().setStatus('idle', null);

    return { ok: true };
  },

  /**
   * 强制关闭工作区（跳过未保存文件检查）
   * 保留同步版本以兼容旧代码
   */
  closeWorkspaceForce(): void {
    clearWorkspaceState();
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

      // 8. 更新文件监听路径
      const allPaths = useWorkspaceStore.getState().folders.map((f) => f.path);
      await FileWatcherService.updateWatchPaths(allPaths);

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

      // 5. 更新文件监听路径
      const remainingPaths = useWorkspaceStore
        .getState()
        .folders.map((f) => f.path);
      if (remainingPaths.length > 0) {
        await FileWatcherService.updateWatchPaths(remainingPaths);
      } else {
        await FileWatcherService.stopWatching();
      }

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
      // 将文件夹路径转换为相对于工作区文件的相对路径
      const foldersWithRelativePaths = state.folders.map((f) => ({
        path: getRelativePath(savePath, f.path),
        name: f.name,
      }));

      const config = {
        version: 1,
        folders: foldersWithRelativePaths,
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

  loadWorkspaceFile: async (
    workspacePath: string,
  ): Promise<WorkspaceLoadResult> => {
    try {
      // 先检查工作区文件是否存在
      const exists = await FsService.checkExists(workspacePath);
      if (!exists) {
        return createWorkspaceLoadError(
          'file-not-found',
          `Workspace file not found: ${workspacePath}`,
          workspacePath,
        );
      }

      // 解析工作区文件
      let config;
      try {
        config = await FsService.parseWorkspaceFile(workspacePath);
      } catch (parseError) {
        const errorMsg = String(parseError).toLowerCase();
        // 区分权限错误和解析错误
        if (
          errorMsg.includes('permission') ||
          errorMsg.includes('access') ||
          errorMsg.includes('denied')
        ) {
          return createWorkspaceLoadError(
            'permission-denied',
            `Permission denied: ${workspacePath}`,
            workspacePath,
          );
        }
        return createWorkspaceLoadError(
          'parse-failed',
          `Failed to parse workspace file: ${parseError}`,
          workspacePath,
        );
      }

      // 将相对路径解析为绝对路径
      const absoluteFolderPaths = config.folders.map(
        (f: { path: string; name?: string }) => ({
          path: resolvePath(workspacePath, f.path),
          name: f.name,
        }),
      );

      // 批量加载所有文件夹树
      const paths = absoluteFolderPaths.map((f) => f.path);
      let batchResult: FolderPathResult[];
      try {
        batchResult = await FsService.listTreeBatch(paths);
      } catch (batchError) {
        const errorMsg = String(batchError).toLowerCase();
        if (
          errorMsg.includes('permission') ||
          errorMsg.includes('access') ||
          errorMsg.includes('denied')
        ) {
          return createWorkspaceLoadError(
            'permission-denied',
            `Permission denied to access workspace folders`,
            workspacePath,
          );
        }
        throw batchError; // 重新抛出其他错误
      }

      // 检查是否有文件夹加载失败
      const failedFolders = batchResult.filter(
        (r: FolderPathResult) => r.error !== undefined,
      );

      // 如果有文件夹加载失败，返回第一个错误
      if (failedFolders.length > 0) {
        const firstError = failedFolders[0];
        const errorMsg = firstError.error?.toLowerCase() || '';

        if (
          errorMsg.includes('permission') ||
          errorMsg.includes('access') ||
          errorMsg.includes('denied')
        ) {
          return createWorkspaceLoadError(
            'permission-denied',
            `Permission denied: ${firstError.path}`,
            firstError.path,
          );
        }

        if (
          errorMsg.includes('not found') ||
          errorMsg.includes('does not exist')
        ) {
          return createWorkspaceLoadError(
            'folder-not-found',
            `Folder not found: ${firstError.path}`,
            firstError.path,
          );
        }
      }

      const rootFolders: RootFolderNode[] = batchResult
        .filter((r: FolderPathResult) => r.error === undefined)
        .map((r: FolderPathResult, index: number) => ({
          workspacePath: r.path,
          displayName:
            absoluteFolderPaths[index]?.name ||
            r.path.split('/').pop() ||
            r.path,
          tree: r.nodes,
        }));

      // 解析 openFiles 和 activeFile 的相对路径
      const resolvedOpenFiles =
        config.state?.openFiles?.map((p: string) =>
          resolvePath(workspacePath, p),
        ) || [];
      const resolvedActiveFile = config.state?.activeFile
        ? resolvePath(workspacePath, config.state.activeFile)
        : null;

      // 原子更新所有 store
      useWorkspaceStore.getState().restoreState({
        folders: absoluteFolderPaths.map(
          (f: { path: string; name?: string }, i: number) => ({
            path: f.path,
            name: f.name,
            index: i,
          }),
        ),
        workspaceFile: workspacePath,
        isDirty: false,
        openFiles: resolvedOpenFiles,
        activeFile: resolvedActiveFile,
      });

      useFileTreeStore.getState().setRootFolders(rootFolders);

      // 启动文件监听
      const allPaths = absoluteFolderPaths.map((f: { path: string }) => f.path);
      await FileWatcherService.startWatching(allPaths, handleFileChange);

      return { ok: true };
    } catch (error) {
      // 对于未知错误，推断错误类型
      const errorMsg = String(error);
      const errorType = inferErrorType(errorMsg);
      return createWorkspaceLoadError(errorType, errorMsg, workspacePath);
    }
  },
};
