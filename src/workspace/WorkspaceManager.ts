import { open } from '@tauri-apps/plugin-dialog';
import { FsService } from '../services/fs/FsService';
import { AutosaveService } from '../services/autosave/AutosaveService';
import { useWorkspaceStore } from '../state/slices/workspaceSlice';
import { useFileTreeStore } from '../state/slices/filetreeSlice';
import { useStatusStore } from '../state/slices/statusSlice';
import { useEditorStore } from '../state/slices/editorSlice';

export const openFile = async (path: string): Promise<void> => {
  try {
    const { activeFile } = useWorkspaceStore.getState();
    const { fileStates } = useEditorStore.getState();

    if (activeFile && fileStates[activeFile]?.isDirty) {
      useStatusStore.getState().setStatus('saving', 'Saving changes...');
      try {
        await AutosaveService.flush(activeFile);
      } catch (error) {
        console.error(`Failed to save ${activeFile}:`, error);
        useStatusStore.getState().setStatus('error', 'Failed to save changes');
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
