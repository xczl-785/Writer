// src/ui/sidebar/WorkspaceRootHeader.tsx
// V6 根文件夹头部组件 - 支持右键菜单和缺失状态

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Folder, X } from 'lucide-react';
import { t } from '../../i18n';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import { getWorkspaceRootMenuItems } from '../components/ContextMenu/workspaceRootMenu';
import { workspaceActions } from '../../state/actions/workspaceActions';
import { FsService } from '../../services/fs/FsService';
import { useStatusStore } from '../../state/slices/statusSlice';
import { InlineInput, type InlineCommitTrigger } from './InlineInput';
import { FolderMissingState } from '../components/ErrorStates';

interface WorkspaceRootHeaderProps {
  folder: {
    workspacePath: string;
    displayName: string;
  };
  /** 文件夹是否缺失（不存在或已移动） */
  isMissing?: boolean;
  onContextMenu?: (event: React.MouseEvent) => void;
}

export const WorkspaceRootHeader: React.FC<WorkspaceRootHeaderProps> = ({
  folder,
  isMissing = false,
  onContextMenu,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(folder.displayName);
  const contextMenu = useContextMenu();

  const toggleExpanded = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded((prev) => !prev);
    },
    [],
  );

  const handleRemoveFolder = useCallback(async () => {
    const result = await workspaceActions.removeFolderFromWorkspace(
      folder.workspacePath,
    );
    if (!result.ok) {
      useStatusStore
        .getState()
        .setStatus('error', `${t('workspace.removeFailed')}: ${result.error}`);
    }
  }, [folder.workspacePath]);

  const handleRename = useCallback(() => {
    setRenameDraft(folder.displayName);
    setIsRenaming(true);
  }, [folder.displayName]);

  const commitRename = useCallback(
    async (nameRaw: string, _trigger: InlineCommitTrigger) => {
      const newName = nameRaw.trim();
      if (!newName || newName === folder.displayName) {
        setIsRenaming(false);
        return;
      }

      workspaceActions.renameWorkspaceFolder(folder.workspacePath, newName);
      setIsRenaming(false);
    },
    [folder.workspacePath, folder.displayName],
  );

  const cancelRename = useCallback(() => {
    setRenameDraft(folder.displayName);
    setIsRenaming(false);
  }, [folder.displayName]);

  const handleRevealInFinder = useCallback(async () => {
    try {
      await FsService.revealInFileManager(folder.workspacePath);
    } catch {
      useStatusStore
        .getState()
        .setStatus('error', t('sidebar.revealFailed'));
    }
  }, [folder.workspacePath]);

  const handleCopyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(folder.workspacePath);
      useStatusStore.getState().setStatus('idle', t('sidebar.pathCopied'));
    } catch {
      useStatusStore.getState().setStatus('error', t('sidebar.copyFailed'));
    }
  }, [folder.workspacePath]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (onContextMenu) {
        onContextMenu(event);
        return;
      }

      const items = getWorkspaceRootMenuItems({
        folderPath: folder.workspacePath,
        displayName: folder.displayName,
        onRename: handleRename,
        onRemove: handleRemoveFolder,
        onRevealInFinder: handleRevealInFinder,
        onCopyPath: handleCopyPath,
      });

      contextMenu.open(event.clientX, event.clientY, items);
    },
    [
      folder.workspacePath,
      folder.displayName,
      handleRename,
      handleRemoveFolder,
      handleRevealInFinder,
      handleCopyPath,
      contextMenu,
      onContextMenu,
    ],
  );

  // 如果文件夹缺失，显示缺失状态
  if (isMissing) {
    return (
      <FolderMissingState
        folderPath={folder.workspacePath}
        displayName={folder.displayName}
        onRemove={handleRemoveFolder}
      />
    );
  }

  return (
    <>
      <div
        className="workspace-root-header group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer text-sm text-zinc-600 hover:bg-zinc-200/50 transition-colors"
        onContextMenu={handleContextMenu}
      >
        <button
          className="expand-button p-0.5 rounded hover:bg-zinc-300/50 transition-colors"
          onClick={toggleExpanded}
          type="button"
          aria-label={isExpanded ? t('workspace.collapse') : t('workspace.expand')}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        <Folder size={16} className="folder-icon text-blue-500 flex-shrink-0" />

        {isRenaming ? (
          <InlineInput
            value={renameDraft}
            onCommit={commitRename}
            onCancel={cancelRename}
            autoFocus={true}
          />
        ) : (
          <span
            className="folder-name truncate flex-1 leading-none"
            title={folder.workspacePath}
          >
            {folder.displayName}
          </span>
        )}

        <button
          className="remove-button p-1 rounded hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            void handleRemoveFolder();
          }}
          type="button"
          title={t('workspace.removeFromWorkspace')}
          aria-label={t('workspace.removeFromWorkspace')}
        >
          <X size={12} />
        </button>
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