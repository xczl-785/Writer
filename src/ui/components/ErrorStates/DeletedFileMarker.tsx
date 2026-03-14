// src/ui/components/ErrorStates/DeletedFileMarker.tsx
// V6 文件删除标记组件 - 显示已被外部删除的文件节点

import React, { useCallback } from 'react';
import { AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { t } from '../../../shared/i18n';
import { useFileTreeStore } from '../../../domains/file/state/fileStore';
import { workspaceActions } from '../../../domains/workspace/services/workspaceActions';

export interface DeletedFileMarkerProps {
  /** 被删除文件的路径 */
  filePath: string;
  /** 文件名 */
  fileName: string;
  /** 是否为文件夹 */
  isDirectory?: boolean;
  /** 可选：恢复操作回调 */
  onRestore?: () => void;
  /** 可选：确认删除回调 */
  onConfirmDelete?: () => void;
  /** 缩进层级 */
  depth?: number;
}

/**
 * 文件删除标记组件
 * 当检测到文件已被外部删除时，显示一个带有恢复/确认删除选项的标记
 */
export const DeletedFileMarker: React.FC<DeletedFileMarkerProps> = ({
  filePath,
  fileName,
  isDirectory = false,
  onRestore,
  onConfirmDelete,
  depth = 0,
}) => {
  const clearDeletedPath = useFileTreeStore((state) => state.clearDeletedPath);

  const handleRestore = useCallback(async () => {
    if (onRestore) {
      onRestore();
      return;
    }
    // 默认行为：尝试重新打开文件（如果文件已被恢复）
    try {
      await workspaceActions.openFile(filePath);
      clearDeletedPath(filePath);
    } catch {
      // 文件确实不存在，保持删除标记
    }
  }, [filePath, onRestore, clearDeletedPath]);

  const handleConfirmDelete = useCallback(() => {
    if (onConfirmDelete) {
      onConfirmDelete();
      return;
    }
    // 默认行为：从树中移除标记
    clearDeletedPath(filePath);
  }, [filePath, onConfirmDelete, clearDeletedPath]);

  const style: React.CSSProperties = {
    paddingLeft: `${depth * 12 + 8}px`,
  };

  return (
    <div
      className="deleted-file-marker group flex items-center gap-1.5 py-1.5 px-2 rounded-md bg-red-50/50 border border-red-100 text-sm"
      style={style}
      role="status"
      aria-live="polite"
    >
      <span className="flex-shrink-0 text-red-400">
        <AlertCircle size={16} aria-hidden="true" />
      </span>

      <span className="flex-1 truncate text-red-600">
        <span className="line-through">{fileName}</span>
        <span className="ml-1.5 text-xs text-red-400">
          (
          {isDirectory
            ? t('errorStates.folderDeleted')
            : t('errorStates.fileDeleted')}
          )
        </span>
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleRestore}
          className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
          title={t('errorStates.restore')}
          aria-label={t('errorStates.restore')}
        >
          <RotateCcw size={12} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleConfirmDelete}
          className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
          title={t('errorStates.confirmRemove')}
          aria-label={t('errorStates.confirmRemove')}
        >
          <Trash2 size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default DeletedFileMarker;
