// src/ui/components/ErrorStates/DragDropOverlay.tsx
// V6 拖拽覆盖层组件 - 文件拖拽时显示视觉反馈

import React, { useState, useEffect, useRef } from 'react';
import { FolderPlus, ArrowDownToLine } from 'lucide-react';
import { t } from '../../../shared/i18n';

export interface DragDropOverlayProps {
  /** 是否显示覆盖层 */
  isVisible: boolean;
  /** 拖拽类型：copy（复制）或 move（移动） */
  dragType?: 'copy' | 'move' | 'none';
  /** 目标路径（可选，用于显示放置目标） */
  targetPath?: string;
  /** 是否为文件夹目标 */
  isFolderTarget?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 放置回调 */
  onDrop?: () => void;
}

/**
 * 拖拽覆盖层组件
 * 在文件拖拽到侧边栏时显示视觉反馈
 */
export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({
  isVisible,
  dragType = 'none',
  targetPath,
  isFolderTarget = false,
  className = '',
  onDrop,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const prevIsVisibleRef = useRef(isVisible);

  // 当 isVisible 变化时重置状态
  useEffect(() => {
    if (!isVisible && prevIsVisibleRef.current) {
      // isVisible 从 true 变为 false，重置拖拽状态
      setIsDragOver(false);
    }
    prevIsVisibleRef.current = isVisible;
  }, [isVisible]);

  // 监听全局拖拽事件
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        setIsDragOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      onDrop?.();
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isVisible, onDrop]);

  if (!isVisible || !isDragOver) {
    return null;
  }

  const getIcon = () => {
    if (isFolderTarget) {
      return <FolderPlus size={24} aria-hidden="true" />;
    }
    return <ArrowDownToLine size={24} aria-hidden="true" />;
  };

  const getMessage = () => {
    if (targetPath) {
      return isFolderTarget
        ? t('errorStates.dropToFolder')
        : t('errorStates.dropToWorkspace');
    }
    return t('errorStates.dropFilesHere');
  };

  const getDragTypeLabel = () => {
    switch (dragType) {
      case 'copy':
        return t('errorStates.copyFiles');
      case 'move':
        return t('errorStates.moveFiles');
      default:
        return null;
    }
  };

  return (
    <div
      className={`drag-drop-overlay fixed inset-0 z-50 pointer-events-none ${className}`}
      role="presentation"
      aria-hidden="true"
    >
      {/* 半透明背景 */}
      <div className="absolute inset-0 bg-blue-500/5" />

      {/* 虚线边框指示器 */}
      <div className="absolute inset-4 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-blue-200">
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <div className="p-3 rounded-full bg-blue-100">{getIcon()}</div>

            <div className="text-sm font-medium">{getMessage()}</div>

            {getDragTypeLabel() && (
              <div className="text-xs text-blue-500">{getDragTypeLabel()}</div>
            )}

            {targetPath && (
              <div className="text-xs text-zinc-500 mt-1 max-w-[200px] truncate">
                {targetPath}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragDropOverlay;
