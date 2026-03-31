// src/ui/sidebar/WorkspaceRootHeader.tsx
// V6 根文件夹头部组件 - 支持右键菜单和缺失状态

import React, { useCallback } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { t } from '../../shared/i18n';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import { getWorkspaceRootMenuItems } from '../components/ContextMenu/workspaceRootMenu';
import { workspaceActions } from '../../domains/workspace/services/workspaceActions';
import { FsService } from '../../domains/file/services/FsService';
import { useStatusStore } from '../../state/slices/statusSlice';
import { showLevel2Notification } from '../../services/error/level2Notification';
import { FolderMissingState } from '../components/ErrorStates';
import { getSidebarErrorMeta } from './sidebarErrorCatalog';

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
  onNewFile?: () => void;
  onNewFolder?: () => void;
  /** 文件夹是否缺失（不存在或已移动） */
  isMissing?: boolean;
  onContextMenu?: (event: React.MouseEvent) => void;
  /** Whether an internal drag is active (for drop target behavior) */
  isInternalDragActive?: boolean;
  /** Whether this header is the current drop target */
  isDropTarget?: boolean;
  /** Data attributes for drag-drop targeting */
  rootDataAttrs?: Record<string, string>;
}

export const WorkspaceRootHeader: React.FC<WorkspaceRootHeaderProps> = ({
  folder,
  isExpanded,
  isSelected = false,
  onToggle,
  onSelect,
  onNewFile,
  onNewFolder,
  isMissing = false,
  onContextMenu,
  isInternalDragActive = false,
  isDropTarget = false,
  rootDataAttrs,
}) => {
  const contextMenu = useContextMenu();

  const showLevel2SidebarError = useCallback(
    (error: unknown, source: string, reason: string, suggestion: string) => {
      showLevel2Notification({
        error,
        source,
        reason,
        suggestion,
        dedupeKey: `${source}:${folder.workspacePath}`,
      });
    },
    [folder.workspacePath],
  );

  const toggleExpanded = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle();
    },
    [onToggle],
  );

  const handleRowClick = useCallback(() => {
    onSelect?.();
    onToggle();
  }, [onSelect, onToggle]);

  const handleRemoveFolder = useCallback(async () => {
    const result = await workspaceActions.removeFolderFromWorkspace(
      folder.workspacePath,
    );
    if (!result.ok) {
      const removeError = getSidebarErrorMeta('rootRemove');
      showLevel2SidebarError(
        new Error(result.error),
        removeError.source,
        removeError.reason,
        removeError.suggestion,
      );
    }
  }, [folder.workspacePath, showLevel2SidebarError]);

  const handleRevealInFinder = useCallback(async () => {
    try {
      await FsService.revealInFileManager(folder.workspacePath);
    } catch {
      const revealError = getSidebarErrorMeta('rootReveal');
      showLevel2SidebarError(
        new Error(revealError.reason),
        revealError.source,
        revealError.reason,
        revealError.suggestion,
      );
    }
  }, [folder.workspacePath, showLevel2SidebarError]);

  const handleCopyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(folder.workspacePath);
      useStatusStore.getState().setStatus('idle', t('sidebar.pathCopied'));
    } catch {
      const copyPathError = getSidebarErrorMeta('rootCopyPath');
      showLevel2SidebarError(
        new Error(copyPathError.reason),
        copyPathError.source,
        copyPathError.reason,
        copyPathError.suggestion,
      );
    }
  }, [folder.workspacePath, showLevel2SidebarError]);

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
        onNewFile: onNewFile ?? (() => {}),
        onNewFolder: onNewFolder ?? (() => {}),
        onRemove: handleRemoveFolder,
        onRevealInFinder: handleRevealInFinder,
        onCopyPath: handleCopyPath,
      });

      contextMenu.open(event.clientX, event.clientY, items);
    },
    [
      folder.workspacePath,
      folder.displayName,
      handleRemoveFolder,
      handleRevealInFinder,
      handleCopyPath,
      onNewFile,
      onNewFolder,
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
        } ${isDropTarget ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}
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
        {...rootDataAttrs}
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
          <span className="text-sm font-bold text-zinc-800 truncate">
            {folder.displayName}
          </span>
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
