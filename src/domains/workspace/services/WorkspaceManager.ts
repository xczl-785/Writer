import { open, save } from '@tauri-apps/plugin-dialog';
import { workspaceActions } from './workspaceActions';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { ErrorService } from '../../../services/error/ErrorService';
import type { NotificationAction } from '../../../state/slices/notificationSlice';
import {
  getWorkspaceContext,
  useWorkspaceStore,
} from '../state/workspaceStore';
import { RecentItemsService } from './RecentItemsService';
import {
  buildDefaultWorkspaceFileName,
  getWorkspaceFileBaseName,
} from '../../../ui/statusbar/workspaceIndicator';
import { t } from '../../../shared/i18n';
import { getSupportedExtensions } from '../../file/utils/fileTypeUtils';

const showLevel2WorkspaceError = (
  error: unknown,
  source: string,
  reason: string,
  suggestion: string,
  dedupeKey = source,
  actions?: NotificationAction[],
): void => {
  useStatusStore.getState().setStatus('idle', null);
  ErrorService.handleWithInfo(error, source, {
    level: 'level2',
    source,
    reason,
    suggestion,
    dedupeKey,
    actions,
  });
};

const normalizeDialogPath = (selected: unknown): string | null => {
  const pickPath = (value: unknown): string | null => {
    if (typeof value === 'string') return value;
    if (value instanceof URL) return value.href;
    if (value && typeof value === 'object' && 'path' in value) {
      const pathValue = (value as { path?: unknown }).path;
      if (typeof pathValue === 'string') return pathValue;
    }
    if (value && typeof value === 'object' && 'pathname' in value) {
      const pathname = (value as { pathname?: unknown }).pathname;
      if (typeof pathname === 'string' && pathname.length > 0) {
        return pathname;
      }
    }
    if (value && typeof value === 'object' && 'href' in value) {
      const href = (value as { href?: unknown }).href;
      if (typeof href === 'string') return href;
    }
    return null;
  };

  if (selected === null || selected === undefined) return null;

  const raw = Array.isArray(selected)
    ? selected.length > 0
      ? pickPath(selected[0])
      : null
    : pickPath(selected);

  if (!raw) return null;

  if (raw.startsWith('file://')) {
    try {
      return decodeURIComponent(new URL(raw).pathname);
    } catch {
      return raw;
    }
  }

  return raw;
};

export const openFile = async (path: string): Promise<void> => {
  try {
    useStatusStore.getState().setStatus('loading', t('file.opening'));

    const result = await workspaceActions.openFile(path);
    if (!result.ok) {
      showLevel2WorkspaceError(
        new Error(result.reason),
        'workspace-open-file',
        result.reason === 'active-flush-failed'
          ? t('workspace.openFileFlushFailed')
          : t('workspace.openFileTargetSaveFailed'),
        t('workspace.openRetryAfterSaveSuggestion'),
        `workspace-open-file:${result.reason}`,
        [{ label: t('error.retry'), run: () => void openFile(path) }],
      );
      return;
    }

    useStatusStore.getState().setStatus('idle');
  } catch (error) {
    showLevel2WorkspaceError(
      error,
      'workspace-open-file',
      t('file.openFailed'),
      t('workspace.openRetrySuggestion'),
      `workspace-open-file:${path}`,
      [{ label: t('error.retry'), run: () => void openFile(path) }],
    );
  }
};

/**
 * 打开单文件对话框（Cmd/Ctrl+O）
 *
 * 打开文件选择对话框，仅显示 Markdown 文件类型
 *
 * @returns 选中的文件路径，或 null（用户取消）
 */
export const openFileWithDialog = async (): Promise<string | null> => {
  try {
    const selected = await open({
      title: t('file.openFileDialogTitle'),
      directory: false, // 单文件模式
      multiple: false,
      filters: [
        {
          name: 'Markdown Files',
          extensions: getSupportedExtensions().map((ext) =>
            ext.replace('.', ''),
          ),
        },
      ],
    });

    // 处理取消情况
    if (!selected) {
      return null;
    }

    // Tauri 返回的可能是 string 或 string[]（取决于 multiple）
    const path = normalizeDialogPath(selected);

    if (!path) {
      return null;
    }

    // 打开选中的文件
    useStatusStore.getState().setStatus('loading', t('file.opening'));

    const result = await workspaceActions.openFile(path);
    if (!result.ok) {
      showLevel2WorkspaceError(
        new Error(result.reason),
        'workspace-open-file-dialog',
        t('file.openFailed'),
        t('workspace.openRetrySuggestion'),
        `workspace-open-file-dialog:${result.reason}`,
        [{ label: t('error.retry'), run: () => void openFile(path) }],
      );
      return null;
    }

    // 添加到最近文件列表
    await RecentItemsService.addFile(path);

    useStatusStore.getState().setStatus('idle');
    return path;
  } catch (error) {
    showLevel2WorkspaceError(
      error,
      'workspace-open-file-dialog',
      t('file.openFailed'),
      t('workspace.openRetrySuggestion'),
      'workspace-open-file-dialog',
      [{ label: t('error.retry'), run: () => void openFileWithDialog() }],
    );
    return null;
  }
};

/**
 * 处理 Cmd/Ctrl+O 快捷键
 */
export const handleOpenFileShortcut = async (): Promise<void> => {
  await openFileWithDialog();
};

export const openWorkspace = async (): Promise<void> => {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      recursive: false,
    });

    console.info('openWorkspace selected:', selected);

    const path = normalizeDialogPath(selected);

    if (!path) {
      useStatusStore.getState().setStatus('idle');
      return;
    }

    useStatusStore.getState().setStatus('loading', t('workspace.loading'));

    try {
      const nodeCount = await workspaceActions.loadWorkspace(path);
      await RecentItemsService.addFolder(path);
      useStatusStore
        .getState()
        .setStatus('idle', `Workspace loaded: ${nodeCount} item(s)`);
    } catch (error) {
      showLevel2WorkspaceError(
        error,
        'workspace-open-folder',
        t('workspace.openFolderFailed'),
        t('workspace.openWorkspaceRetrySuggestion'),
        `workspace-open-folder:${path}`,
        [{ label: t('error.retry'), run: () => void openWorkspaceAtPath(path) }],
      );
    }
  } catch (error) {
    showLevel2WorkspaceError(
      error,
      'workspace-open-folder-dialog',
      t('workspace.openFolderDialogFailed'),
      t('workspace.openFolderDialogRetrySuggestion'),
      'workspace-open-folder-dialog',
      [{ label: t('error.retry'), run: () => void openWorkspace() }],
    );
  }
};

export const openWorkspaceAtPath = async (path: string): Promise<boolean> => {
  try {
    useStatusStore.getState().setStatus('loading', t('workspace.loading'));

    const nodeCount = await workspaceActions.loadWorkspace(path);
    await RecentItemsService.addFolder(path);
    useStatusStore
      .getState()
      .setStatus('idle', `Workspace loaded: ${nodeCount} item(s)`);
    return true;
  } catch (error) {
    showLevel2WorkspaceError(
      error,
      'workspace-open-folder',
      t('workspace.openFolderFailed'),
      t('workspace.openWorkspaceRetrySuggestion'),
      `workspace-open-folder:${path}`,
      [{ label: t('error.retry'), run: () => void openWorkspaceAtPath(path) }],
    );
    return false;
  }
};

export const addFolderToWorkspaceByDialog = async (): Promise<void> => {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      recursive: false,
    });

    const path = normalizeDialogPath(selected);

    if (!path) {
      useStatusStore.getState().setStatus('idle');
      return;
    }

    useStatusStore.getState().setStatus('loading', 'Adding folder...');

    const result = await workspaceActions.addFolderToWorkspace(path);
    if (result.ok) {
      useStatusStore.getState().setStatus('idle', 'Folder added to workspace');
      return;
    }

    showLevel2WorkspaceError(
      new Error(result.error),
      'workspace-add-folder-dialog',
      result.error,
      'Retry adding the folder to the workspace.',
      `workspace-add-folder-dialog:${path}`,
    );
  } catch (error) {
    showLevel2WorkspaceError(
      error,
      'Failed to add folder to workspace',
      'Retry adding the folder to the workspace.',
      'workspace-add-folder-dialog',
    );
  }
};

export const addFolderPathToWorkspace = async (
  path: string,
): Promise<boolean> => {
  try {
    useStatusStore.getState().setStatus('loading', 'Adding folder...');

    const result = await workspaceActions.addFolderToWorkspace(path);
    if (result.ok) {
      await RecentItemsService.addFolder(path);
      useStatusStore.getState().setStatus('idle', 'Folder added to workspace');
      return true;
    }

    showLevel2WorkspaceError(
      new Error(result.error),
      'workspace-add-folder',
      result.error,
      'Retry adding the folder to the workspace.',
      `workspace-add-folder:${path}`,
    );
    return false;
  } catch (error) {
    showLevel2WorkspaceError(
      error,
      'Failed to add folder to workspace',
      'Retry adding the folder to the workspace.',
      `workspace-add-folder:${path}`,
    );
    return false;
  }
};

export const handleDroppedFolderPaths = async (
  paths: string[],
  options: {
    openInNewWorkspace: boolean;
  },
): Promise<void> => {
  const uniquePaths = Array.from(new Set(paths));

  if (uniquePaths.length === 0) {
    useStatusStore
      .getState()
      .setStatus('error', t('workspace.dragFoldersOnly'));
    return;
  }

  if (options.openInNewWorkspace) {
    const [firstPath, ...restPaths] = uniquePaths;
    const opened = await openWorkspaceAtPath(firstPath);
    if (!opened) {
      return;
    }

    for (const path of restPaths) {
      const added = await addFolderPathToWorkspace(path);
      if (!added) {
        break;
      }
    }
    return;
  }

  for (const path of uniquePaths) {
    const added = await addFolderPathToWorkspace(path);
    if (!added) {
      break;
    }
  }
};

export const openWorkspaceFile = async (): Promise<void> => {
  try {
    const selected = await open({
      directory: false,
      multiple: false,
      filters: [
        {
          name: 'Writer Workspace',
          extensions: ['writer-workspace'],
        },
      ],
    });

    const path = normalizeDialogPath(selected);

    if (!path) {
      useStatusStore.getState().setStatus('idle');
      return;
    }

    useStatusStore.getState().setStatus('loading', 'Loading workspace...');

    const result = await workspaceActions.loadWorkspaceFile(path);
    if (result.ok) {
      await RecentItemsService.addWorkspace(
        path,
        getWorkspaceFileBaseName(path),
      );
      useStatusStore.getState().setStatus('idle');
      return;
    }

    showLevel2WorkspaceError(
      new Error(result.errorMessage),
      'workspace-open-file',
      result.errorMessage,
      'Retry opening the workspace file.',
      `workspace-open-workspace-file:${path}`,
    );
  } catch (error) {
    showLevel2WorkspaceError(
      error,
      'workspace-open-workspace-file-dialog',
      'Failed to open workspace file',
      'Retry opening the workspace file.',
      'workspace-open-workspace-file-dialog',
    );
  }
};

export const saveWorkspaceFileByDialog = async (): Promise<void> => {
  try {
    const workspace = useWorkspaceStore.getState();
    if (getWorkspaceContext(workspace) === 'none') {
      useStatusStore.getState().setStatus('error', 'No workspace to save');
      return;
    }

    const selected = await save({
      defaultPath: buildDefaultWorkspaceFileName(workspace),
      filters: [
        {
          name: 'Writer Workspace',
          extensions: ['writer-workspace'],
        },
      ],
    });

    const rawPath = normalizeDialogPath(selected);
    if (!rawPath) {
      useStatusStore.getState().setStatus('idle');
      return;
    }

    const path = rawPath.endsWith('.writer-workspace')
      ? rawPath
      : `${rawPath}.writer-workspace`;

    useStatusStore.getState().setStatus('loading', 'Saving workspace...');

    const result = await workspaceActions.saveWorkspaceFile(path);
    if (!result.ok) {
      showLevel2WorkspaceError(
        new Error(result.error),
        'workspace-save-dialog',
        result.error,
        'Retry saving the workspace.',
        `workspace-save-dialog:${path}`,
      );
      return;
    }

    await RecentItemsService.addWorkspace(path, getWorkspaceFileBaseName(path));
    useStatusStore.getState().setStatus('idle', 'Workspace saved');
  } catch (error) {
    showLevel2WorkspaceError(
      error,
      'Failed to save workspace',
      'Retry saving the workspace.',
      'workspace-save-dialog',
    );
  }
};

export const saveCurrentWorkspace = async (): Promise<void> => {
  try {
    const workspace = useWorkspaceStore.getState();
    if (getWorkspaceContext(workspace) === 'none') {
      useStatusStore.getState().setStatus('error', 'No workspace to save');
      return;
    }

    const existingPath = workspace.workspaceFile;
    if (!existingPath) {
      await saveWorkspaceFileByDialog();
      return;
    }

    useStatusStore.getState().setStatus('loading', 'Saving workspace...');

    const result = await workspaceActions.saveWorkspaceFile(existingPath);
    if (!result.ok) {
      showLevel2WorkspaceError(
        new Error(result.error),
        'workspace-save-current',
        result.error,
        'Retry saving the workspace.',
        `workspace-save-current:${existingPath}`,
      );
      return;
    }

    await RecentItemsService.addWorkspace(
      existingPath,
      getWorkspaceFileBaseName(existingPath),
    );
    useStatusStore.getState().setStatus('idle', 'Workspace saved');
  } catch (error) {
    showLevel2WorkspaceError(
      error,
      'Failed to save workspace',
      'Retry saving the workspace.',
      'workspace-save-current',
    );
  }
};
