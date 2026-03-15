// src/domains/file/services/SingleFileDropHandler.ts
// V6.1 单文件拖拽 - 核心拖拽处理服务层

import type { DropHandlerDeps, DropResult } from './types';
import { getDropTargetDirectory, findRootPath } from '../utils/ghostPathUtils';
import { isSupportedFile, getUnsupportedMessage } from '../utils/fileTypeUtils';
import { FsService } from './FsService';
import { joinPath } from '../../../utils/pathUtils';
import { useDropStore } from '../../../state/slices/dropSlice';
import { t } from '../../../shared/i18n';

/**
 * 获取错误提示信息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return t('fileDrop.unknownError');
}

/**
 * 拖入编辑区 - 直接打开
 *
 * @param sourcePath - 源文件路径
 * @param deps - 依赖注入
 */
export async function handleDropToEditor(
  sourcePath: string,
  deps: DropHandlerDeps,
): Promise<DropResult> {
  // 1. 文件类型检查
  if (!isSupportedFile(sourcePath)) {
    const message = getUnsupportedMessage(sourcePath);
    deps.onShowStatus('error', message);
    return {
      success: false,
      error: { type: 'UNSUPPORTED_TYPE', path: sourcePath },
    };
  }

  // 2. 直接打开文件
  try {
    const result = await deps.onOpenFile(sourcePath);

    if (!result.ok) {
      return {
        success: false,
        error: {
          type: 'OPEN_FAILED',
          path: sourcePath,
          reason: result.reason,
        },
      };
    }

    deps.onShowStatus('success', t('fileDrop.openSuccess'));
    return { success: true, openedFile: sourcePath };
  } catch (error) {
    const message = getErrorMessage(error);
    deps.onShowStatus('error', message);
    return {
      success: false,
      error: {
        type: 'OPEN_FAILED',
        path: sourcePath,
        reason: message,
      },
    };
  }
}

/**
 * 拖入文件树侧边栏 - 复制到工作区
 *
 * @param sourcePath - 源文件路径
 * @param deps - 依赖注入
 */
export async function handleDropToSidebar(
  sourcePath: string,
  deps: DropHandlerDeps,
): Promise<DropResult> {
  // 检查是否有保存操作进行中
  if (deps.isSaving()) {
    deps.onShowStatus('error', t('fileDrop.saveInProgress'));
    return {
      success: false,
      error: { type: 'SAVE_IN_PROGRESS' },
    };
  }

  // 尝试设置操作锁（使用 Store）
  const operationStarted = useDropStore
    .getState()
    .startOperation(`File drop: ${sourcePath}`);

  if (!operationStarted) {
    deps.onShowStatus('error', t('fileDrop.operationInProgress'));
    return {
      success: false,
      error: { type: 'OPERATION_IN_PROGRESS' },
    };
  }

  deps.onSetDragOver(false); // 清除拖拽态

  try {
    // 1. 文件类型检查
    if (!isSupportedFile(sourcePath)) {
      const message = getUnsupportedMessage(sourcePath);
      deps.onShowStatus('error', message);
      return {
        success: false,
        error: { type: 'UNSUPPORTED_TYPE', path: sourcePath },
      };
    }

    // 2. 获取目标目录
    const targetDir = getDropTargetDirectory({
      selectedPath: deps.selectedPath,
      rootFolders: deps.rootFolders,
    });

    if (!targetDir) {
      const message = t('fileDrop.noWorkspace');
      deps.onShowStatus('error', message);
      // 无工作区时退化为编辑区行为
      return await handleDropToEditor(sourcePath, deps);
    }

    // 3. 计算目标路径
    const fileName = sourcePath.split('/').pop() || 'untitled.md';
    const targetPath = joinPath(targetDir, fileName);

    // 4. 冲突检查
    const exists = await FsService.checkExists(targetPath);
    if (exists) {
      const action = await deps.showConflictDialog(fileName);

      if (action === 'cancel') {
        deps.onShowStatus('info', t('fileDrop.cancelled'));
        return {
          success: false,
          error: { type: 'USER_CANCELLED' },
        };
      }
    }

    // 5. 执行复制
    const copyResult = await FsService.copyFileWithResult(
      sourcePath,
      targetPath,
    );

    // 6. 刷新文件树
    const rootPath = findRootPath(targetDir, deps.rootFolders);
    if (rootPath) {
      await deps.onRefreshFileTree(rootPath);
    }

    // 7. 打开文件（使用实际写入路径）
    const openResult = await deps.onOpenFile(copyResult.actualPath);

    if (!openResult.ok) {
      return {
        success: false,
        error: {
          type: 'OPEN_FAILED',
          path: copyResult.actualPath,
          reason: openResult.reason,
        },
      };
    }

    deps.onShowStatus('success', t('fileDrop.copySuccess'));
    return { success: true, openedFile: copyResult.actualPath };
  } catch (error) {
    const message = getErrorMessage(error);

    // 禁用态反馈（2s 后自动解除）
    deps.onSetDropBlocked(true, message);
    setTimeout(() => deps.onSetDropBlocked(false), 2000);

    deps.onShowStatus('error', message);

    return {
      success: false,
      error: {
        type: 'COPY_FAILED',
        source: sourcePath,
        target: '',
        reason: message,
      },
    };
  } finally {
    // 只有成功设置锁的情况下才释放
    if (operationStarted) {
      useDropStore.getState().endOperation();
    }
  }
}
