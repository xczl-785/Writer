// src/ui/components/ErrorStates/WorkspaceCorruptedState.tsx
// V6 工作区损坏状态组件 - 显示工作区配置文件损坏时的错误状态

import React, { useCallback } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { t } from '../../../i18n';
import { workspaceActions } from '../../../state/actions/workspaceActions';
import { openWorkspace } from '../../../workspace/WorkspaceManager';

export interface WorkspaceCorruptedStateProps {
  /** 工作区文件路径 */
  workspacePath: string;
  /** 错误信息 */
  errorMessage?: string;
  /** 可选：重置工作区回调 */
  onReset?: () => void;
  /** 可选：重新打开回调 */
  onReopen?: () => void;
}

/**
 * 工作区损坏状态组件
 * 当工作区配置文件无法解析时显示
 */
export const WorkspaceCorruptedState: React.FC<
  WorkspaceCorruptedStateProps
> = ({ workspacePath, errorMessage, onReset, onReopen }) => {
  const handleReset = useCallback(async () => {
    if (onReset) {
      onReset();
      return;
    }
    // 默认行为：关闭当前工作区并重新打开
    await workspaceActions.closeWorkspace(true);
    await openWorkspace();
  }, [onReset]);

  const handleReopen = useCallback(async () => {
    if (onReopen) {
      onReopen();
      return;
    }
    // 默认行为：打开文件夹选择对话框
    await openWorkspace();
  }, [onReopen]);

  const displayName = workspacePath.split('/').pop() || workspacePath;

  return (
    <div
      className="workspace-corrupted-state flex flex-col items-center justify-center py-8 px-4 text-center"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
        <AlertTriangle size={24} className="text-red-500" aria-hidden="true" />
      </div>

      <div className="text-base font-medium text-zinc-800 mb-2">
        {displayName}
      </div>

      <div className="text-xs text-zinc-500 mb-2 max-w-[300px] truncate">
        {workspacePath}
      </div>

      <div className="text-sm text-zinc-600 mb-2">
        {t('errorStates.workspaceCorrupted')}
      </div>

      <div className="text-xs text-zinc-500 mb-4 max-w-[300px]">
        {t('errorStates.workspaceCorruptedDesc')}
      </div>

      {errorMessage && (
        <div className="text-xs text-red-500 mb-4 max-w-[300px] font-mono bg-red-50 p-2 rounded overflow-auto max-h-20">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleReopen}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          title={t('errorStates.openFolder')}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {t('errorStates.openFolder')}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors"
          title={t('errorStates.resetWorkspace')}
        >
          <X size={16} aria-hidden="true" />
          {t('errorStates.resetWorkspace')}
        </button>
      </div>
    </div>
  );
};

export default WorkspaceCorruptedState;
