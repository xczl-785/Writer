// src/ui/workspace/EmptyStateWorkspace.tsx
// V6 空状态界面组件 - 严格对齐原型图 v6_workspace_v5_base.html 第 125-166 行

import React, { useState, useCallback } from 'react';
import { Sparkles, Briefcase, Folder, FileText } from 'lucide-react';
import { t } from '../../i18n';
import { type RecentItem } from '../../domains/workspace/services/RecentItemsService';

interface EmptyStateWorkspaceProps {
  onOpenFolder: () => void;
  onOpenWorkspace: () => void;
  /** Callback when a file/folder is dropped onto the workspace */
  onDropItem?: (paths: string[]) => void;
  /** Callback when a recent item is clicked */
  onSelectRecentItem?: (item: RecentItem) => void;
  recentItems?: RecentItem[];
  isDragOver?: boolean;
}

/**
 * 获取最近项目的 Lucide 图标
 */
const getRecentItemIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'workspace':
      return <Briefcase className="w-4 h-4 mr-2.5 text-zinc-400" />;
    case 'folder':
      return <Folder className="w-4 h-4 mr-2.5 text-zinc-400" />;
    case 'file':
    default:
      return <FileText className="w-4 h-4 mr-2.5 text-zinc-400" />;
  }
};

export const EmptyStateWorkspace: React.FC<EmptyStateWorkspaceProps> = ({
  onOpenFolder,
  onOpenWorkspace,
  onDropItem,
  onSelectRecentItem,
  recentItems = [],
  isDragOver = false,
}) => {
  const [isLocalDragOver, setIsLocalDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsLocalDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsLocalDragOver(false);
  }, []);

  /**
   * Handle file/folder drop event
   * In Tauri, the dropped file's path can be accessed via file.path
   * @see https://tauri.app/v2/guides/features/drag-and-drop/
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsLocalDragOver(false);

      const files = e.dataTransfer.files as FileList & {
        [index: number]: File & { path?: string };
      };
      if (files.length > 0 && onDropItem) {
        const paths: string[] = [];

        for (let index = 0; index < files.length; index += 1) {
          const path = files[index]?.path;
          if (path) {
            paths.push(path);
          }
        }

        if (paths.length > 0) {
          onDropItem(paths);
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
      className={`absolute inset-0 flex flex-col items-center justify-center bg-white z-20 ${isLocalDragOver || isDragOver ? 'bg-zinc-50 ring-1 ring-inset ring-zinc-300' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="application"
      aria-label="Empty State Workspace"
    >
      <div className="w-full max-w-sm py-20 flex flex-col items-center">
        {/* Logo 区域 - 原型图第 129-131 行 */}
        <div className="mb-1">
          <Sparkles className="w-10 h-10 text-zinc-900" />
        </div>
        <div className="text-xl font-bold mb-1">Writer</div>
        <div className="text-sm text-zinc-400 mb-10 italic">写作，心流</div>

        {/* 主操作按钮 - 原型图第 133-142 行 */}
        <div className="flex space-x-4 mb-10">
          <button
            className="px-6 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
            onClick={onOpenFolder}
            type="button"
          >
            {t('workspace.openFolder')}
          </button>
          <button
            className="px-6 py-2 border border-zinc-200 text-zinc-600 text-sm font-medium rounded-md hover:bg-zinc-50 transition-colors cursor-pointer"
            onClick={onOpenWorkspace}
            type="button"
          >
            {t('workspace.openWorkspace')}
          </button>
        </div>

        {/* 最近打开 - 原型图第 144-163 行 */}
        {recentItems.length > 0 && (
          <div className="w-full px-8">
            {/* 标题带左右横线 */}
            <div className="flex items-center text-zinc-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              <div className="flex-grow border-t border-zinc-200 mr-3"></div>
              {t('workspace.recent')}
              <div className="flex-grow border-t border-zinc-200 ml-3"></div>
            </div>
            {/* 统一列表，无分组 */}
            <div className="space-y-1">
              {recentItems.slice(0, 5).map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="w-full flex items-center text-sm p-2 rounded hover:bg-zinc-100/50 text-zinc-700 cursor-pointer transition-colors text-left"
                  title={item.path}
                  onClick={() => handleRecentItemClick(item)}
                >
                  {getRecentItemIcon(item.type)}
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 拖拽提示 - 原型图第 163 行，无图标 */}
        <div className="w-full px-8">
          <p className="mt-8 text-center text-xs text-zinc-300 italic">
            {t('workspace.dragHint')}
          </p>
        </div>
      </div>
    </div>
  );
};
