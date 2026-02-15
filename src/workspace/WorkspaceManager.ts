import { open } from '@tauri-apps/plugin-dialog';
import { FsService } from '../services/fs/FsService';
import { FsSafety } from '../services/fs/FsSafety';
import { useWorkspaceStore } from '../state/slices/workspaceSlice';
import { useFileTreeStore } from '../state/slices/filetreeSlice';
import { useStatusStore } from '../state/slices/statusSlice';
import { useEditorStore } from '../state/slices/editorSlice';

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
      recursive: true,
    });

    if (selected === null) {
      return;
    }

    const path = Array.isArray(selected) ? selected[0] : selected;

    if (!path) return;

    useStatusStore.getState().setStatus('loading', 'Loading workspace...');

    useWorkspaceStore.getState().setWorkspacePath(path);

    try {
      const nodes = await FsService.listTree(path);

      useFileTreeStore.getState().setNodes(nodes);

      useStatusStore.getState().setStatus('idle');
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
