// src/ui/sidebar/MultiRootFileTree.tsx
// V6 多根文件树容器组件 - 支持空白处右键菜单

import React, { useCallback } from 'react';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import {
  useWorkspaceStore,
  getWorkspaceType,
} from '../../state/slices/workspaceSlice';
import { WorkspaceRootHeader } from './WorkspaceRootHeader';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import { getEmptyAreaMenuItems } from '../components/ContextMenu/workspaceRootMenu';
import { openWorkspace } from '../../workspace/WorkspaceManager';
import { t } from '../../i18n';
import type { FileNode } from '../../state/types';

interface GhostNodeState {
  parentPath: string | null;
  type: 'file' | 'directory';
  rootPath: string;
}

interface MultiRootFileTreeProps {
  ghostNode?: GhostNodeState | null;
  onGhostCommit?: (name: string, trigger: 'enter' | 'blur') => Promise<void>;
  onGhostCancel?: () => void;
  selectedPath?: string | null;
  activeFile?: string | null;
  renamingPath?: string | null;
  renameTrigger?: number;
  onOpenContextMenu?: (
    event: React.MouseEvent,
    node: FileNode,
    rootPath: string,
  ) => void;
  onRequestRenameStart?: (path: string) => void;
  onRequestRenameEnd?: () => void;
  onSelect?: (path: string) => void;
  onSetGhostNode?: (ghost: GhostNodeState | null) => void;
  renderTreeNode?: (node: FileNode, rootPath: string) => React.ReactNode;
}

export const MultiRootFileTree: React.FC<MultiRootFileTreeProps> = ({
  onSetGhostNode,
  renderTreeNode,
}) => {
  const rootFolders = useFileTreeStore((state) => state.rootFolders);
  const loadingPaths = useFileTreeStore((state) => state.loadingPaths);
  const errorPaths = useFileTreeStore((state) => state.errorPaths);
  const folders = useWorkspaceStore((state) => state.folders);
  const contextMenu = useContextMenu();

  const workspaceType = getWorkspaceType({
    folders,
    workspaceFile: null,
    isDirty: false,
    openFiles: [],
    activeFile: null,
  });

  const hasWorkspace = rootFolders.length > 0;

  // 获取第一个根路径作为默认创建位置
  const firstRootPath =
    rootFolders.length > 0 ? rootFolders[0].workspacePath : null;

  const handleAddFolderToWorkspace = useCallback(() => {
    void openWorkspace();
  }, []);

  const handleNewFile = useCallback(() => {
    if (!firstRootPath || !onSetGhostNode) return;
    onSetGhostNode({
      parentPath: null,
      type: 'file',
      rootPath: firstRootPath,
    });
  }, [firstRootPath, onSetGhostNode]);

  const handleNewFolder = useCallback(() => {
    if (!firstRootPath || !onSetGhostNode) return;
    onSetGhostNode({
      parentPath: null,
      type: 'directory',
      rootPath: firstRootPath,
    });
  }, [firstRootPath, onSetGhostNode]);

  const handleEmptyAreaContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const items = getEmptyAreaMenuItems({
        onAddFolderToWorkspace: handleAddFolderToWorkspace,
        onNewFile: handleNewFile,
        onNewFolder: handleNewFolder,
        hasWorkspace,
      });

      contextMenu.open(event.clientX, event.clientY, items);
    },
    [
      handleAddFolderToWorkspace,
      handleNewFile,
      handleNewFolder,
      hasWorkspace,
      contextMenu,
    ],
  );

  if (rootFolders.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className="multi-root-file-tree flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5"
        onContextMenu={handleEmptyAreaContextMenu}
      >
        {rootFolders.map((rootFolder) => (
          <div
            key={rootFolder.workspacePath}
            className="root-folder-group mb-2"
          >
            {/* V6: 多根模式下显示根文件夹标题 */}
            {workspaceType === 'multi' && (
              <WorkspaceRootHeader folder={rootFolder} />
            )}

            <div className="root-folder-content">
              {loadingPaths.has(rootFolder.workspacePath) ? (
                <div className="loading-indicator px-3 py-2 text-xs text-zinc-400">
                  {t('sidebar.loading')}
                </div>
              ) : errorPaths.has(rootFolder.workspacePath) ? (
                <div className="error-indicator px-3 py-2 text-xs text-red-500">
                  {errorPaths.get(rootFolder.workspacePath)}
                </div>
              ) : (
                rootFolder.tree.map((node) =>
                  renderTreeNode ? (
                    renderTreeNode(node, rootFolder.workspacePath)
                  ) : (
                    <div key={node.path} className="text-xs text-zinc-500">
                      {node.name}
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <ContextMenu
        isOpen={contextMenu.state.isOpen}
        x={contextMenu.state.x}
        y={contextMenu.state.y}
        items={contextMenu.state.items}
        onClose={contextMenu.close}
      />
    </>
  );
};
