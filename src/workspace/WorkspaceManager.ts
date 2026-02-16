import { open } from '@tauri-apps/plugin-dialog';
import { FsService } from '../services/fs/FsService';
import { FsSafety } from '../services/fs/FsSafety';
import { useWorkspaceStore } from '../state/slices/workspaceSlice';
import { useFileTreeStore } from '../state/slices/filetreeSlice';
import { useStatusStore } from '../state/slices/statusSlice';
import { useEditorStore } from '../state/slices/editorSlice';

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
    const { activeFile } = useWorkspaceStore.getState();

    if (activeFile) {
      const success = await FsSafety.flushAffectedFiles(activeFile);
      if (!success) {
        useStatusStore.getState().setStatus('error', 'Failed to save changes');
        return;
      }
    }

    if (path !== activeFile) {
      const success = await FsSafety.flushAffectedFiles(path);
      if (!success) {
        useStatusStore
          .getState()
          .setStatus('error', 'Failed to save target file');
        return;
      }
    }

    useStatusStore.getState().setStatus('loading', 'Opening file...');

    const content = await FsService.readFile(path);

    useEditorStore.getState().initializeFile(path, content);
    useWorkspaceStore.getState().openFile(path);

    useStatusStore.getState().setStatus('idle');
  } catch (error) {
    console.error(`Failed to open file ${path}:`, error);
    useStatusStore.getState().setStatus('error', 'Failed to open file');
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

    useWorkspaceStore.setState({
      currentPath: path,
      openFiles: [],
      activeFile: null,
    });
    useEditorStore.setState({ fileStates: {} });

    try {
      const nodes = await FsService.listTree(path);

      useFileTreeStore.getState().setNodes(nodes);
      useFileTreeStore.getState().setSelectedPath(null);
      useStatusStore
        .getState()
        .setStatus('idle', `Workspace loaded: ${nodes.length} item(s)`);
    } catch (error) {
      console.error('Failed to load file tree:', error);
      useStatusStore
        .getState()
        .setStatus('error', 'Failed to load workspace files');
    }
  } catch (error) {
    console.error('Failed to open dialog:', error);
    useStatusStore
      .getState()
      .setStatus('error', 'Failed to open directory dialog');
  }
};
