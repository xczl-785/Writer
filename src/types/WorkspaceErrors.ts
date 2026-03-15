// src/types/WorkspaceErrors.ts
// V6 工作区错误类型定义

/**
 * 工作区加载错误类型
 * 用于区分不同类型的加载失败，触发不同的 UI 反馈
 */
export type WorkspaceLoadErrorType =
  | 'file-not-found'
  | 'permission-denied'
  | 'parse-failed'
  | 'folder-not-found'
  | 'unknown';

/**
 * 工作区加载错误结果
 */
export interface WorkspaceLoadError {
  ok: false;
  errorType: WorkspaceLoadErrorType;
  errorMessage: string;
  /** 相关路径（如文件路径或文件夹路径） */
  path?: string;
}

/**
 * 工作区加载成功结果
 */
export interface WorkspaceLoadSuccess {
  ok: true;
}

/**
 * 工作区加载结果
 */
export type WorkspaceLoadResult = WorkspaceLoadSuccess | WorkspaceLoadError;

/**
 * 工作区锁状态
 */
export interface WorkspaceLockStatus {
  /** 是否被锁定 */
  isLocked: boolean;
  /** 锁定的进程 ID（可选） */
  lockedBy?: string;
  /** 锁定时间（可选） */
  lockedAt?: number;
}

/**
 * 创建工作区加载错误
 */
export function createWorkspaceLoadError(
  errorType: WorkspaceLoadErrorType,
  errorMessage: string,
  path?: string,
): WorkspaceLoadError {
  return {
    ok: false,
    errorType,
    errorMessage,
    path,
  };
}

/**
 * 从错误字符串推断错误类型
 */
export function inferErrorType(error: string): WorkspaceLoadErrorType {
  const lowerError = error.toLowerCase();

  if (
    lowerError.includes('permission') ||
    lowerError.includes('access') ||
    lowerError.includes('denied')
  ) {
    return 'permission-denied';
  }

  if (
    lowerError.includes('not found') ||
    lowerError.includes('does not exist')
  ) {
    // 区分文件不存在和文件夹不存在
    if (lowerError.includes('folder') || lowerError.includes('directory')) {
      return 'folder-not-found';
    }
    return 'file-not-found';
  }

  if (
    lowerError.includes('parse') ||
    lowerError.includes('json') ||
    lowerError.includes('invalid') ||
    lowerError.includes('format')
  ) {
    return 'parse-failed';
  }

  return 'unknown';
}
