import { FsSafety } from '../../services/fs/FsSafety';
import { FsService } from '../../services/fs/FsService';
import { useEditorStore } from '../slices/editorSlice';
import { useFileTreeStore } from '../slices/filetreeSlice';
import { useWorkspaceStore } from '../slices/workspaceSlice';

export type OpenFileResult =
  | { ok: true }
  | { ok: false; reason: 'active-flush-failed' | 'target-flush-failed' };

export const workspaceActions = {
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
    useWorkspaceStore.setState({
      currentPath: path,
      openFiles: [],
      activeFile: null,
    });
    useEditorStore.setState({ fileStates: {} });

    const nodes = await FsService.listTree(path);
    useFileTreeStore.getState().setNodes(nodes);
    useFileTreeStore.getState().setSelectedPath(null);
    return nodes.length;
  },
};
