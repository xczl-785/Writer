// src/ui/workspace/EmptyStateWorkspace.tsx
// V6 空状态界面组件

import React, { useState, useCallback } from 'react';
import { FolderOpen, FileText, Upload } from 'lucide-react';
import { t } from '../../i18n';

interface EmptyStateWorkspaceProps {
  onOpenFolder: () => void;
  onOpenWorkspace: () => void;
  recentItems?: RecentItem[];
}

interface RecentItem {
  type: 'workspace' | 'folder' | 'file';
  path: string;
  name: string;
  lastOpened: number;
}

export const EmptyStateWorkspace: React.FC<EmptyStateWorkspaceProps> = ({
  onOpenFolder,
  onOpenWorkspace,
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // 简化处理：只要有文件拖入就调用 onOpenFolder
      // 实际路径获取需要 Tauri API 支持
      onOpenFolder();
    }
  }, [onOpenFolder]);

  // 按类型分组最近项目
  const groupedItems = recentItems.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, RecentItem[]>);

  const recentWorkspaces = groupedItems.workspace || [];
  const recentFolders = groupedItems.folder || [];
  const recentFiles = groupedItems.file || [];

  return (
    <div
      className="empty-state-workspace"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`empty-state-content ${isDragOver ? 'drag-over' : ''}`}>
        {/* Logo 区域 */}
        <div className="empty-state-header">
          <div className="empty-state-logo">✦ Writer</div>
          <p className="empty-state-tagline">Writing, Flow</p>
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
        {(recentWorkspaces.length > 0 || recentFolders.length > 0 || recentFiles.length > 0) && (
          <div className="empty-state-recent">
            <h3 className="empty-state-recent-title">{t('workspace.recent')}</h3>
            
            {recentWorkspaces.length > 0 && (
              <div className="empty-state-recent-group">
                <span className="empty-state-recent-label">{t('workspace.workspaces')}</span>
                {recentWorkspaces.slice(0, 5).map((item) => (
                  <div key={item.path} className="empty-state-recent-item">
                    <span className="item-icon">💼</span>
                    <span className="item-name" title={item.path}>{item.name}</span>
                  </div>
                ))}
              </div>
            )}
            
            {recentFolders.length > 0 && (
              <div className="empty-state-recent-group">
                <span className="empty-state-recent-label">{t('workspace.folders')}</span>
                {recentFolders.slice(0, 5).map((item) => (
                  <div key={item.path} className="empty-state-recent-item">
                    <span className="item-icon">📁</span>
                    <span className="item-name" title={item.path}>{item.name}</span>
                  </div>
                ))}
              </div>
            )}
            
            {recentFiles.length > 0 && (
              <div className="empty-state-recent-group">
                <span className="empty-state-recent-label">{t('workspace.files')}</span>
                {recentFiles.slice(0, 5).map((item) => (
                  <div key={item.path} className="empty-state-recent-item">
                    <span className="item-icon">📄</span>
                    <span className="item-name" title={item.path}>{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 拖拽提示 */}
        <div className="empty-state-drag-hint" role="status" aria-live="polite">
          <Upload size={16} />
          <span>{t('workspace.dragHint')}</span>
        </div>
      </div>
    </div>
  );
};
