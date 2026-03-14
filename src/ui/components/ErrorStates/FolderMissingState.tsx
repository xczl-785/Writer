// src/ui/components/ErrorStates/FolderMissingState.tsx
// V6 文件夹缺失状态组件 - 显示工作区文件夹不存在时的错误状态

import React, { useCallback } from 'react';
import { AlertTriangle, FolderOpen, X } from 'lucide-react';
import { t } from '../../../i18n';
import { openWorkspace } from '../../../workspace/WorkspaceManager';
import { workspaceActions } from '../../../state/actions/workspaceActions';

export interface FolderMissingStateProps {
  /** 缺失文件夹的路径 */
  folderPath: string;
  /** 文件夹显示名称 */
  displayName: string;
  /** 可选：移除文件夹回调 */
  onRemove?: () => void;
  /** 可选：重新打开文件夹回调 */
  onReopen?: () => void;
}

/**
 * 文件夹缺失状态组件
 * 当工作区中的某个根文件夹在文件系统中不存在时显示
 */
export const FolderMissingState: React.FC<FolderMissingStateProps> = ({
  folderPath,
  displayName,
  onRemove,
  onReopen,
}) => {
  const handleRemove = useCallback(async () => {
    if (onRemove) {
      onRemove();
      return;
    }
    // 默认行为：从工作区移除
    await workspaceActions.removeFolderFromWorkspace(folderPath);
  }, [folderPath, onRemove]);

  const handleReopen = useCallback(async () => {
    if (onReopen) {
      onReopen();
      return;
    }
    // 默认行为：打开文件夹选择对话框
    await openWorkspace();
  }, [onReopen]);

  return (
    <div
      className="folder-missing-state flex flex-col items-center justify-center py-4 px-3 text-center"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 mb-3">
        <AlertTriangle
          size={20}
          className="text-amber-600"
          aria-hidden="true"
        />
      </div>

      <div className="text-sm font-medium text-zinc-800 mb-1">
        {displayName}
      </div>

      <div className="text-xs text-zinc-500 mb-3 max-w-[200px] truncate">
        {folderPath}
      </div>

      <div className="text-xs text-zinc-600 mb-4">
        {t('errorStates.folderMissing')}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleReopen}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          title={t('errorStates.openFolder')}
        >
          <FolderOpen size={14} aria-hidden="true" />
          {t('errorStates.openFolder')}
        </button>

        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors"
          title={t('workspace.removeFromWorkspace')}
        >
          <X size={14} aria-hidden="true" />
          {t('errorStates.removeFromWorkspace')}
        </button>
      </div>
    </div>
  );
};

export default FolderMissingState;
