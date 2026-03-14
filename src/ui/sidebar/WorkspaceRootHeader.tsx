// src/ui/sidebar/WorkspaceRootHeader.tsx
// V6 根文件夹头部组件 - 支持右键菜单和缺失状态

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { t } from '../../shared/i18n';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import { getWorkspaceRootMenuItems } from '../components/ContextMenu/workspaceRootMenu';
import { workspaceActions } from '../../domains/workspace/services/workspaceActions';
import { FsService } from '../../domains/file/services/FsService';
import { useStatusStore } from '../../state/slices/statusSlice';
import { InlineInput, type InlineCommitTrigger } from './InlineInput';
import { FolderMissingState } from '../components/ErrorStates';

// 纯线框风格的根文件夹图标组件
const FolderOutlineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

interface WorkspaceRootHeaderProps {
  folder: {
    workspacePath: string;
    displayName: string;
  };
  isExpanded: boolean;
  isSelected?: boolean;
  onToggle: () => void;
  onSelect?: () => void;
  /** 文件夹是否缺失（不存在或已移动） */
  isMissing?: boolean;
  onContextMenu?: (event: React.MouseEvent) => void;
}

export const WorkspaceRootHeader: React.FC<WorkspaceRootHeaderProps> = ({
  folder,
  isExpanded,
  isSelected = false,
  onToggle,
  onSelect,
  isMissing = false,
  onContextMenu,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(folder.displayName);
  const contextMenu = useContextMenu();

  const toggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  }, [onToggle]);

  const handleRowClick = useCallback(() => {
    onSelect?.();
    onToggle();
  }, [onSelect, onToggle]);

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
    async (nameRaw: string, trigger: InlineCommitTrigger) => {
      const newName = nameRaw.trim();
      if (!newName || newName === folder.displayName) {
        setIsRenaming(false);
        return;
      }

      // trigger 用于区分提交方式（enter 或 blur），此处统一处理
      void trigger;

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
      useStatusStore.getState().setStatus('error', t('sidebar.revealFailed'));
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
        className={`group flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
          isSelected ? 'bg-zinc-100/80' : 'hover:bg-zinc-100/80'
        }`}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        aria-label={`${t('workspace.rootFolder')}: ${folder.displayName}`}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded(e as unknown as React.MouseEvent);
          }
        }}
      >
        {/* 展开/折叠按钮 */}
        <div className="flex items-center min-w-0">
          <button
            className="flex items-center justify-center mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={toggleExpanded}
            type="button"
            aria-label={
              isExpanded ? t('workspace.collapse') : t('workspace.expand')
            }
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-zinc-400" />
            ) : (
              <ChevronRight size={16} className="text-zinc-300" />
            )}
          </button>

          {/* 纯线框根文件夹图标 */}
          <FolderOutlineIcon className="w-4 h-4 mr-2 text-zinc-600 shrink-0" />

          {isRenaming ? (
            <InlineInput
              value={renameDraft}
              onCommit={commitRename}
              onCancel={cancelRename}
              autoFocus={true}
            />
          ) : (
            <span className="text-sm font-bold text-zinc-800 truncate">
              {folder.displayName}
            </span>
          )}
        </div>

        {/* 移除按钮 */}
        <button
          className="flex items-center justify-center p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-zinc-300 transition-all shrink-0"
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

      {/* 分隔线 */}
      <div className="h-px bg-zinc-200 mx-3 mb-1 opacity-70" />

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
