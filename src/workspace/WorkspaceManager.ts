import { open } from '@tauri-apps/plugin-dialog';
import { workspaceActions } from '../state/actions/workspaceActions';
import { useStatusStore } from '../state/slices/statusSlice';
import { ErrorService } from '../services/error/ErrorService';

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
