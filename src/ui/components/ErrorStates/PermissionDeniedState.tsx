// src/ui/components/ErrorStates/PermissionDeniedState.tsx
// V6 权限不足状态组件 - 显示文件/文件夹权限不足时的错误状态

import React, { useCallback } from 'react';
import { Lock, ExternalLink, X } from 'lucide-react';
import { t } from '../../../shared/i18n';
import { workspaceActions } from '../../../domains/workspace/services/workspaceActions';

export interface PermissionDeniedStateProps {
  /** 相关路径 */
  path: string;
  /** 显示名称 */
  displayName: string;
  /** 是否为文件夹 */
  isDirectory?: boolean;
  /** 可选：移除回调（仅文件夹） */
  onRemove?: () => void;
  /** 可选：重试回调 */
  onRetry?: () => void;
}

/**
 * 权限不足状态组件
 * 当无法访问文件或文件夹时显示
 */
export const PermissionDeniedState: React.FC<PermissionDeniedStateProps> = ({
  path,
  displayName,
  isDirectory = false,
  onRemove,
  onRetry,
}) => {
  const handleRemove = useCallback(async () => {
    if (onRemove) {
      onRemove();
      return;
    }
    // 默认行为：从工作区移除（仅文件夹）
    if (isDirectory) {
      await workspaceActions.removeFolderFromWorkspace(path);
    }
  }, [path, isDirectory, onRemove]);

  const handleRetry = useCallback(async () => {
    if (onRetry) {
      onRetry();
      return;
    }
    // 默认行为：尝试重新加载
    if (isDirectory) {
      await workspaceActions.addFolderToWorkspace(path);
    }
  }, [path, isDirectory, onRetry]);

  const handleOpenHelp = useCallback(() => {
    // 打开系统帮助文档（根据操作系统）
    const platform = navigator.platform.toLowerCase();
    const isMac = platform.includes('mac');
    const isWindows = platform.includes('win');

    const helpUrl = isMac
      ? 'https://support.apple.com/guide/mac-help/change-permissions-for-files-folders-or-disks-mhlp67'
      : isWindows
        ? 'https://support.microsoft.com/en-us/windows/work-with-files-and-folders-onedrive-work-or-school-40922695-ffc5-4d1b-baf0-65c3ebd3a0ae'
        : 'https://wiki.archlinux.org/title/File_permissions_and_attributes';

    window.open(helpUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div
      className="permission-denied-state flex flex-col items-center justify-center py-6 px-4 text-center"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
        <Lock size={24} className="text-red-500" aria-hidden="true" />
      </div>

      <div className="text-base font-medium text-zinc-800 mb-1">
        {displayName}
      </div>

      <div className="text-xs text-zinc-500 mb-3 max-w-[300px] truncate">
        {path}
      </div>

      <div className="text-sm text-zinc-600 mb-1">
        {t('errorStates.permissionDenied')}
      </div>

      <div className="text-xs text-zinc-500 mb-4 max-w-[300px]">
        {t('errorStates.permissionDeniedDesc')}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            title={t('error.retry')}
          >
            <ExternalLink size={16} aria-hidden="true" />
            {t('error.retry')}
          </button>
        )}

        <button
          type="button"
          onClick={handleOpenHelp}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors"
          title={t('errorStates.checkPermissions')}
        >
          <ExternalLink size={16} aria-hidden="true" />
          {t('errorStates.checkPermissions')}
        </button>

        {isDirectory && onRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            title={t('errorStates.removeFromWorkspace')}
          >
            <X size={16} aria-hidden="true" />
            {t('errorStates.removeFromWorkspace')}
          </button>
        )}
      </div>
    </div>
  );
};

export default PermissionDeniedState;
