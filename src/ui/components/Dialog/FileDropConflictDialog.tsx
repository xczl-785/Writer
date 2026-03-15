// src/ui/components/Dialog/FileDropConflictDialog.tsx
// V6.1 单文件拖拽 - 文件拖拽冲突对话框组件

import React, { useCallback, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { t } from '../../../shared/i18n';

export type ConflictDialogAction = 'overwrite' | 'cancel';

export interface FileConflictDialogProps {
  /** 源文件路径 */
  sourcePath: string;
  /** 目标文件路径 */
  targetPath: string;
  /** 文件名 */
  fileName: string;
  /** 确认回调 */
  onConfirm: (action: ConflictDialogAction) => void;
  /** 取消回调 */
  onCancel: () => void;
}

/**
 * 文件冲突对话框组件
 */
export const FileConflictDialog: React.FC<FileConflictDialogProps> = ({
  fileName,
  onConfirm,
  onCancel,
}) => {
  const handleOverwrite = useCallback(() => {
    onConfirm('overwrite');
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // 键盘事件处理（Escape 键取消）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/30" onClick={handleCancel} />

      {/* 对话框 */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        {/* 图标和标题 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 id="dialog-title" className="text-lg font-semibold text-zinc-900">
            {t('fileConflict.title')}
          </h3>
        </div>

        {/* 内容 */}
        <div className="mb-6">
          <p className="text-sm text-zinc-600 mb-2">
            <span className="font-medium text-zinc-900">{fileName}</span>{' '}
            {t('fileConflict.message')}
          </p>
          <div className="bg-zinc-50 rounded-md p-3 mt-3">
            <p className="text-xs text-zinc-500">{t('fileConflict.hint')}</p>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
            onClick={handleCancel}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-amber-600 text-white hover:bg-amber-700 rounded-md transition-colors"
            onClick={handleOverwrite}
            autoFocus
          >
            {t('fileConflict.overwrite')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 以 Promise 形式显示对话框
 *
 * @param fileName - 文件名
 * @returns 用户选择的操作
 */
export function showFileDropConflictDialog(
  fileName: string,
): Promise<ConflictDialogAction> {
  return new Promise((resolve) => {
    // 检查是否已存在对话框，防止重复创建
    const existingContainer = document.getElementById(
      'file-drop-conflict-dialog-container',
    );
    if (existingContainer) {
      console.warn('[FileDropConflictDialog] Dialog already open');
      resolve('cancel');
      return;
    }

    const container = document.createElement('div');
    container.id = 'file-drop-conflict-dialog-container';
    document.body.appendChild(container);

    // 清理标志（防止内存泄漏）
    let isCleanedUp = false;

    // Root 引用（用于 unmount）
    let rootRef: { unmount: () => void } | null = null;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      // 1. 卸载 React 组件（释放事件监听器等资源）
      if (rootRef) {
        rootRef.unmount();
        rootRef = null;
      }

      // 2. 移除 DOM 容器
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };

    const handleClose = (action: ConflictDialogAction | null) => {
      cleanup();
      resolve(action || 'cancel');
    };

    const dialog = (
      <FileConflictDialog
        sourcePath=""
        targetPath=""
        fileName={fileName}
        onConfirm={(action) => handleClose(action)}
        onCancel={() => handleClose(null)}
      />
    );

    // 使用 React 18 createRoot
    import('react-dom/client')
      .then(({ createRoot }) => {
        if (isCleanedUp) return;

        const root = createRoot(container);
        rootRef = { unmount: () => root.unmount() };
        root.render(dialog);
      })
      .catch((error) => {
        console.error('Failed to load react-dom/client:', error);
        cleanup();
        resolve('cancel');
      });
  });
}
