import { FsService } from '../../services/fs/FsService';
import { useEditorStore } from '../slices/editorSlice';
import { useFileTreeStore } from '../slices/filetreeSlice';
import { useWorkspaceStore } from '../slices/workspaceSlice';

const refreshCurrentTree = async (): Promise<void> => {
  const { currentPath } = useWorkspaceStore.getState();
  if (!currentPath) return;

  const nodes = await FsService.listTree(currentPath);
  useFileTreeStore.getState().setNodes(nodes);
};

export const fileActions = {
  async renamePath(oldPath: string, newPath: string): Promise<void> {
    await FsService.renameNode(oldPath, newPath);
    useWorkspaceStore.getState().renameFile(oldPath, newPath);
    useEditorStore.getState().renameFile(oldPath, newPath);
    await refreshCurrentTree();
  },

  async deletePath(path: string): Promise<void> {
    await FsService.deleteNode(path);
    useWorkspaceStore.getState().removePath(path);
    useEditorStore.getState().removePath(path);
    await refreshCurrentTree();

    const selectedPath = useFileTreeStore.getState().selectedPath;
    if (
      selectedPath &&
      (selectedPath === path || selectedPath.startsWith(`${path}/`))
    ) {
      useFileTreeStore.getState().setSelectedPath(null);
    }
  },
};
