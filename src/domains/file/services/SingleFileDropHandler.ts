import type { DropHandlerDeps, DropResult } from './types';
import { getDropTargetDirectory, findRootPath } from '../utils/ghostPathUtils';
import { isSupportedFile, getUnsupportedMessage } from '../utils/fileTypeUtils';
import { FsService } from './FsService';
import { joinPath, normalizePath } from '../../../utils/pathUtils';
import { useDropStore } from '../../../state/slices/dropSlice';
import { t } from '../../../shared/i18n';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return t('fileDrop.unknownError');
}

function createDropResult(success: true, openedFile: string): DropResult;
function createDropResult(
  success: false,
  error: NonNullable<DropResult['error']>,
): DropResult;
function createDropResult(
  success: boolean,
  value: string | NonNullable<DropResult['error']>,
): DropResult {
  if (success) {
    return { success: true, openedFile: value as string };
  }
  return { success: false, error: value as NonNullable<DropResult['error']> };
}

function validateFile(
  sourcePath: string,
  onShowStatus: DropHandlerDeps['onShowStatus'],
): DropResult | null {
  if (!isSupportedFile(sourcePath)) {
    const message = getUnsupportedMessage(sourcePath);
    onShowStatus('error', message);
    return createDropResult(false, {
      type: 'UNSUPPORTED_TYPE',
      path: sourcePath,
    });
  }
  return null;
}

async function resolveTargetPath(
  sourcePath: string,
  targetDir: string,
): Promise<{ fileName: string; targetPath: string }> {
  const normalizedSourcePath = normalizePath(sourcePath);
  const fileName = normalizedSourcePath.split('/').pop() || 'untitled.md';
  const targetPath = joinPath(targetDir, fileName);
  return { fileName, targetPath };
}

async function handleFileConflict(
  fileName: string,
  targetPath: string,
  showConflictDialog: DropHandlerDeps['showConflictDialog'],
  onShowStatus: DropHandlerDeps['onShowStatus'],
): Promise<'proceed' | 'cancel' | 'error'> {
  const exists = await FsService.checkExists(targetPath);
  if (!exists) {
    return 'proceed';
  }

  const action = await showConflictDialog(fileName);
  if (action === 'cancel') {
    onShowStatus('info', t('fileDrop.cancelled'));
    return 'cancel';
  }
  return 'proceed';
}

async function copyAndOpenFile(
  sourcePath: string,
  targetPath: string,
  rootPath: string | null,
  deps: DropHandlerDeps,
): Promise<DropResult> {
  const copyResult = await FsService.copyFileWithResult(sourcePath, targetPath);

  if (rootPath) {
    await deps.onRefreshFileTree(rootPath);
  }

  const openResult = await deps.onOpenFile(copyResult.actualPath);
  if (!openResult.ok) {
    return createDropResult(false, {
      type: 'OPEN_FAILED',
      path: copyResult.actualPath,
      reason: openResult.reason,
    });
  }

  deps.onShowStatus('success', t('fileDrop.copySuccess'));
  return createDropResult(true, copyResult.actualPath);
}

function tryAcquireOperationLock(sourcePath: string): boolean {
  return useDropStore.getState().startOperation(`File drop: ${sourcePath}`);
}

function releaseOperationLock(): void {
  useDropStore.getState().endOperation();
}

export async function handleDropToEditor(
  sourcePath: string,
  deps: DropHandlerDeps,
): Promise<DropResult> {
  const validationError = validateFile(sourcePath, deps.onShowStatus);
  if (validationError) {
    return validationError;
  }

  try {
    const result = await deps.onOpenFile(sourcePath);
    if (!result.ok) {
      return createDropResult(false, {
        type: 'OPEN_FAILED',
        path: sourcePath,
        reason: result.reason,
      });
    }

    deps.onShowStatus('success', t('fileDrop.openSuccess'));
    return createDropResult(true, sourcePath);
  } catch (error) {
    const message = getErrorMessage(error);
    deps.onShowStatus('error', message);
    return createDropResult(false, {
      type: 'OPEN_FAILED',
      path: sourcePath,
      reason: message,
    });
  }
}

export async function handleDropToSidebar(
  sourcePath: string,
  deps: DropHandlerDeps,
): Promise<DropResult> {
  if (deps.isSaving()) {
    deps.onShowStatus('error', t('fileDrop.saveInProgress'));
    return createDropResult(false, { type: 'SAVE_IN_PROGRESS' });
  }

  const operationStarted = tryAcquireOperationLock(sourcePath);
  if (!operationStarted) {
    deps.onShowStatus('error', t('fileDrop.operationInProgress'));
    return createDropResult(false, { type: 'OPERATION_IN_PROGRESS' });
  }

  deps.onSetDragOver(false);

  try {
    return await executeDropToSidebar(sourcePath, deps);
  } catch (error) {
    const message = getErrorMessage(error);
    deps.onShowStatus('error', message);
    return createDropResult(false, {
      type: 'COPY_FAILED',
      source: sourcePath,
      target: '',
      reason: message,
    });
  } finally {
    if (operationStarted) {
      releaseOperationLock();
    }
  }
}

async function executeDropToSidebar(
  sourcePath: string,
  deps: DropHandlerDeps,
): Promise<DropResult> {
  const validationError = validateFile(sourcePath, deps.onShowStatus);
  if (validationError) {
    return validationError;
  }

  const targetDir = getDropTargetDirectory({
    selectedPath: deps.selectedPath,
    rootFolders: deps.rootFolders,
  });

  if (!targetDir) {
    deps.onShowStatus('error', t('fileDrop.noWorkspace'));
    return handleDropToEditor(sourcePath, deps);
  }

  const { fileName, targetPath } = await resolveTargetPath(
    sourcePath,
    targetDir,
  );

  const conflictResult = await handleFileConflict(
    fileName,
    targetPath,
    deps.showConflictDialog,
    deps.onShowStatus,
  );

  if (conflictResult === 'cancel') {
    return createDropResult(false, { type: 'USER_CANCELLED' });
  }

  const rootPath = findRootPath(targetDir, deps.rootFolders);
  return copyAndOpenFile(sourcePath, targetPath, rootPath, deps);
}
