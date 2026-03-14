import { open, save } from '@tauri-apps/plugin-dialog';
import { workspaceActions } from './workspaceActions';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { ErrorService } from '../../../services/error/ErrorService';
import { useWorkspaceStore } from '../state/workspaceStore';
import { RecentItemsService } from './RecentItemsService';
import { buildDefaultWorkspaceFileName, getWorkspaceFileBaseName } from '../../../ui/statusbar/workspaceIndicator';
import { t } from '../../../shared/i18n';

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
    useStatusStore.getState().setStatus('loading', 'Opening file...');

    const result = await workspaceActions.openFile(path);
    if (!result.ok) {
      useStatusStore
        .getState()
        .setStatus(
          'error',
          result.reason === 'active-flush-failed'
            ? 'Failed to save changes'
            : 'Failed to save target file',
        );
      return;
    }

    useStatusStore.getState().setStatus('idle');
  } catch (error) {
    ErrorService.handle(
      error,
      `Failed to open file ${path}`,
      'Failed to open file',
    );
  }
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

    useStatusStore.getState().setStatus('loading', 'Loading workspace...');

    try {
      const nodeCount = await workspaceActions.loadWorkspace(path);
      await RecentItemsService.addFolder(path);
      useStatusStore
        .getState()
        .setStatus('idle', `Workspace loaded: ${nodeCount} item(s)`);
    } catch (error) {
      ErrorService.handle(
        error,
        'Failed to load file tree',
        'Failed to load workspace files',
      );
    }
  } catch (error) {
    ErrorService.handle(
      error,
      'Failed to open dialog',
      'Failed to open directory dialog',
    );
  }
};

export const openWorkspaceAtPath = async (path: string): Promise<boolean> => {
  try {
    useStatusStore.getState().setStatus('loading', 'Loading workspace...');

    const nodeCount = await workspaceActions.loadWorkspace(path);
    await RecentItemsService.addFolder(path);
    useStatusStore
      .getState()
      .setStatus('idle', `Workspace loaded: ${nodeCount} item(s)`);
    return true;
  } catch (error) {
    ErrorService.handle(
      error,
      'Failed to load file tree',
      'Failed to load workspace files',
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

    useStatusStore.getState().setStatus('error', result.error);
  } catch (error) {
    ErrorService.handle(
      error,
      'Failed to open add-folder dialog',
      'Failed to add folder to workspace',
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

    useStatusStore.getState().setStatus('error', result.error);
    return false;
  } catch (error) {
    ErrorService.handle(
      error,
      'Failed to add folder to workspace',
      'Failed to add folder to workspace',
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
      await RecentItemsService.addWorkspace(path, getWorkspaceFileBaseName(path));
      useStatusStore.getState().setStatus('idle');
      return;
    }

    useStatusStore.getState().setStatus('error', result.errorMessage);
  } catch (error) {
    ErrorService.handle(
      error,
      'Failed to open workspace file dialog',
      'Failed to open workspace file',
    );
  }
};

export const saveWorkspaceFileByDialog = async (): Promise<void> => {
  try {
    const workspace = useWorkspaceStore.getState();
    if (workspace.folders.length === 0) {
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
      useStatusStore.getState().setStatus('error', result.error);
      return;
    }

    await RecentItemsService.addWorkspace(path, getWorkspaceFileBaseName(path));
    useStatusStore.getState().setStatus('idle', 'Workspace saved');
  } catch (error) {
    ErrorService.handle(
      error,
      'Failed to save workspace file',
      'Failed to save workspace',
    );
  }
};

export const saveCurrentWorkspace = async (): Promise<void> => {
  try {
    const workspace = useWorkspaceStore.getState();
    if (workspace.folders.length === 0) {
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
      useStatusStore.getState().setStatus('error', result.error);
      return;
    }

    await RecentItemsService.addWorkspace(
      existingPath,
      getWorkspaceFileBaseName(existingPath),
    );
    useStatusStore.getState().setStatus('idle', 'Workspace saved');
  } catch (error) {
    ErrorService.handle(
      error,
      'Failed to save current workspace',
      'Failed to save workspace',
    );
  }
};
