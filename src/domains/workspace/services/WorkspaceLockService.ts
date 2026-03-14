// src/services/workspace/WorkspaceLockService.ts
// V6 工作区锁服务 - 检测工作区是否在其他窗口打开

import { invoke } from '@tauri-apps/api/core';

/**
 * Rust 返回的锁信息（snake_case）
 */
interface RustLockInfo {
  pid: number;
  locked_at: number;
  description?: string;
}

/**
 * Rust 返回的锁状态（snake_case）
 */
interface RustWorkspaceLockStatus {
  is_locked: boolean;
  lock_info: RustLockInfo | null;
}

/**
 * 工作区锁状态
 */
export interface WorkspaceLockStatus {
  /** 是否被锁定 */
  isLocked: boolean;
  /** 锁定的进程 ID */
  lockedBy?: string;
  /** 锁定时间 */
  lockedAt?: number;
}

/**
 * 工作区锁服务
 *
 * 用于检测和管理工作区文件锁，防止多个窗口同时编辑同一工作区
 */
export const WorkspaceLockService = {
  /**
   * 检查工作区锁状态
   *
   * @param workspacePath 工作区文件路径
   * @returns 锁状态
   */
  async checkLock(workspacePath: string): Promise<WorkspaceLockStatus> {
    try {
      const result = await invoke<RustWorkspaceLockStatus>(
        'check_workspace_lock',
        {
          workspacePath,
        },
      );

      return {
        isLocked: result.is_locked,
        lockedBy: result.lock_info?.pid.toString(),
        lockedAt: result.lock_info?.locked_at,
      };
    } catch (error) {
      console.error('Failed to check workspace lock:', error);
      return { isLocked: false };
    }
  },

  /**
   * 尝试获取工作区锁
   *
   * @param workspacePath 工作区文件路径
   * @param description 可选描述
   * @returns 是否成功获取锁
   */
  async acquireLock(
    workspacePath: string,
    description?: string,
  ): Promise<boolean> {
    try {
      return await invoke<boolean>('acquire_workspace_lock', {
        workspacePath,
        description,
      });
    } catch (error) {
      console.error('Failed to acquire workspace lock:', error);
      return false;
    }
  },

  /**
   * 释放工作区锁
   *
   * @param workspacePath 工作区文件路径
   */
  async releaseLock(workspacePath: string): Promise<void> {
    try {
      await invoke('release_workspace_lock', { workspacePath });
    } catch (error) {
      console.error('Failed to release workspace lock:', error);
    }
  },

  /**
   * 强制释放工作区锁
   *
   * 注意：仅在确定其他进程已退出时使用
   *
   * @param workspacePath 工作区文件路径
   */
  async forceReleaseLock(workspacePath: string): Promise<void> {
    try {
      await invoke('force_release_workspace_lock', { workspacePath });
    } catch (error) {
      console.error('Failed to force release workspace lock:', error);
    }
  },
};

export default WorkspaceLockService;
