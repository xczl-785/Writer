// src/domains/file/services/types.ts
// V6.1 单文件拖拽 - 类型定义

import type { RootFolderNode } from '../state/fileStore';
import type { OpenFileResult } from '../../workspace/services/workspaceActions';

/**
 * 冲突对话框操作
 */
export type ConflictDialogAction = 'overwrite' | 'cancel';

/**
 * 依赖注入接口
 */
export interface DropHandlerDeps {
  // ========== 状态读取 ==========
  /** 当前选中的文件/目录路径 */
  selectedPath: string | null;
  /** 根文件夹列表 */
  rootFolders: RootFolderNode[];
  /** 是否有工作区 */
  hasWorkspace: boolean;

  // ========== 状态写入（回调形式）==========
  /** 打开文件 */
  onOpenFile: (path: string) => Promise<OpenFileResult>;
  /** 刷新文件树 */
  onRefreshFileTree: (rootPath: string) => Promise<void>;
  /** 显示状态消息 */
  onShowStatus: (type: 'success' | 'error' | 'info', message: string) => void;

  // ========== 对话框 ==========
  /** 显示冲突对话框 */
  showConflictDialog: (fileName: string) => Promise<ConflictDialogAction>;

  // ========== 禁用态反馈 ==========
  /** 拖拽进入/离开反馈 */
  onSetDragOver: (over: boolean) => void;
  /** 禁用态反馈（拖拽到非接受区域） */
  onSetDropBlocked: (blocked: boolean, reason?: string) => void;

  // ========== 并发控制 ==========
  /** 检查是否有未完成的保存操作 */
  isSaving: () => boolean;
}

/**
 * 拖拽结果
 */
export interface DropResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息（失败时） */
  error?: DropError;
  /** 打开的文件路径（成功时） */
  openedFile?: string;
}

/**
 * 拖拽错误类型
 */
export type DropError =
  | { type: 'UNSUPPORTED_TYPE'; path: string }
  | { type: 'SAVE_CURRENT_FAILED'; reason: string }
  | { type: 'COPY_FAILED'; source: string; target: string; reason: string }
  | { type: 'OPEN_FAILED'; path: string; reason: string }
  | { type: 'USER_CANCELLED' }
  | { type: 'OPERATION_IN_PROGRESS' }
  | { type: 'SAVE_IN_PROGRESS' }
  | { type: 'NO_WORKSPACE' };
