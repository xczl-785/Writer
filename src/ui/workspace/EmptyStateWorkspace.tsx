// src/ui/workspace/EmptyStateWorkspace.tsx
// V6 空状态界面组件

import React, { useState, useCallback } from 'react';
import { FolderOpen, FileText, Upload } from 'lucide-react';
import { t } from '../../i18n';
import { type RecentItem } from '../../services/recent/RecentItemsService';

interface EmptyStateWorkspaceProps {
  onOpenFolder: () => void;
  onOpenWorkspace: () => void;
  /** Callback when a file/folder is dropped onto the workspace */
  onDropItem?: (path: string) => void;
  /** Callback when a recent item is clicked */
  onSelectRecentItem?: (item: RecentItem) => void;
  recentItems?: RecentItem[];
}

export const EmptyStateWorkspace: React.FC<EmptyStateWorkspaceProps> = ({
  onOpenFolder,
  onOpenWorkspace,
  onDropItem,
  onSelectRecentItem,
  recentItems = [],
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  /**
   * Handle file/folder drop event
   * In Tauri, the dropped file's path can be accessed via file.path
   * @see https://tauri.app/v2/guides/features/drag-and-drop/
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0 && onDropItem) {
        // In Tauri, the File object has a `path` property
        const file = files[0] as File & { path?: string };
        const path = file.path;
        if (path) {
          onDropItem(path);
        } else {
          // Fallback: if path is not available, open folder dialog
          onOpenFolder();
        }
      } else if (files.length > 0) {
        // No onDropItem callback provided, fallback to open folder dialog
        onOpenFolder();
      }
    },
    [onDropItem, onOpenFolder],
  );

  // 按类型分组最近项目
  const groupedItems = recentItems.reduce(
    (acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<string, RecentItem[]>,
  );

  const recentWorkspaces = groupedItems.workspace || [];
  const recentFolders = groupedItems.folder || [];
  const recentFiles = groupedItems.file || [];

  /**
   * Handle recent item click
   */
  const handleRecentItemClick = useCallback(
    (item: RecentItem) => {
      if (onSelectRecentItem) {
        onSelectRecentItem(item);
      }
    },
    [onSelectRecentItem],
  );

  return (
    <div
      className="empty-state-workspace"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="application"
      aria-label="Empty State Workspace"
    >
      <div
        className={`empty-state-content ${isDragOver ? 'drag-over' : ''}`}
        tabIndex={-1}
      >
        {/* Logo 区域 - 规范 2.1.1 */}
        <div className="empty-state-header">
          <div className="empty-state-logo">✦ Writer ✦</div>
          <p className="empty-state-tagline">写作，心流</p>
        </div>

        {/* 主操作按钮 */}
        <div className="empty-state-actions">
          <button
            className="btn btn-primary"
            onClick={onOpenFolder}
            type="button"
          >
            <FolderOpen size={18} />
            {t('workspace.openFolder')}
          </button>

          <button
            className="btn btn-secondary"
            onClick={onOpenWorkspace}
            type="button"
          >
            <FileText size={18} />
            {t('workspace.openWorkspace')}
          </button>
        </div>

        {/* 最近项目 */}
        {(recentWorkspaces.length > 0 ||
          recentFolders.length > 0 ||
          recentFiles.length > 0) && (
          <div className="empty-state-recent">
            <h3 className="empty-state-recent-title">
              {t('workspace.recent')}
            </h3>

            {recentWorkspaces.length > 0 && (
              <div className="empty-state-recent-group">
                <span className="empty-state-recent-label">
                  {t('workspace.workspaces')}
                </span>
                {recentWorkspaces.slice(0, 5).map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className="empty-state-recent-item empty-state-recent-item-clickable"
                    title={item.path}
                    onClick={() => handleRecentItemClick(item)}
                  >
                    <span className="item-icon" aria-hidden="true">
                      💼
                    </span>
                    <span className="item-name">{item.name}</span>
                  </button>
                ))}
              </div>
            )}

            {recentFolders.length > 0 && (
              <div className="empty-state-recent-group">
                <span className="empty-state-recent-label">
                  {t('workspace.folders')}
                </span>
                {recentFolders.slice(0, 5).map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className="empty-state-recent-item empty-state-recent-item-clickable"
                    title={item.path}
                    onClick={() => handleRecentItemClick(item)}
                  >
                    <span className="item-icon" aria-hidden="true">
                      📁
                    </span>
                    <span className="item-name">{item.name}</span>
                  </button>
                ))}
              </div>
            )}

            {recentFiles.length > 0 && (
              <div className="empty-state-recent-group">
                <span className="empty-state-recent-label">
                  {t('workspace.files')}
                </span>
                {recentFiles.slice(0, 5).map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className="empty-state-recent-item empty-state-recent-item-clickable"
                    title={item.path}
                    onClick={() => handleRecentItemClick(item)}
                  >
                    <span className="item-icon" aria-hidden="true">
                      📄
                    </span>
                    <span className="item-name">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 拖拽提示 */}
        <p className="empty-state-drag-hint">
          <Upload size={16} />
          <span>{t('workspace.dragHint')}</span>
        </p>
      </div>
    </div>
  );
};
