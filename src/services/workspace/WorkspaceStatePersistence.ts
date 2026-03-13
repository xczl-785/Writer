// src/services/workspace/WorkspaceStatePersistence.ts
// 工作区状态持久化服务 - 使用 Tauri API 实现

import { invoke } from '@tauri-apps/api/core';
import type {
  WorkspaceState,
  WorkspaceFolder,
} from '../../state/slices/workspaceSlice';

export interface PersistedWorkspaceState {
  version: number;
  folders: WorkspaceFolder[];
  openFiles: string[];
  activeFile: string | null;
  updatedAt: number;
}

// 缓存应用配置目录
let cachedConfigDir: string | null = null;

export const WorkspaceStatePersistence = {
  // 获取应用配置目录
  async getConfigDir(): Promise<string> {
    if (cachedConfigDir) {
      return cachedConfigDir;
    }

    const configDir = await invoke<string>('get_app_config_dir');
    cachedConfigDir = configDir;
    return configDir;
  },

  // 获取工作区存储路径
  async getStoragePath(workspaceId: string): Promise<string> {
    const configDir = await this.getConfigDir();
    return `${configDir}/workspace-state/${workspaceId}.json`;
  },

  // 生成工作区 ID
  generateId(workspacePath: string): string {
    // 使用简单 hash 生成唯一 ID
    let hash = 0;
    for (let i = 0; i < workspacePath.length; i++) {
      const char = workspacePath.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  },

  // 保存状态
  async saveState(
    workspaceId: string,
    state: Partial<WorkspaceState>,
  ): Promise<void> {
    const storagePath = await this.getStoragePath(workspaceId);

    const persistedState: PersistedWorkspaceState = {
      version: 1,
      folders: state.folders ?? [],
      openFiles: state.openFiles ?? [],
      activeFile: state.activeFile ?? null,
      updatedAt: Date.now(),
    };

    // 使用 write_json_file 命令（会自动创建目录并原子写入）
    await invoke('write_json_file', {
      path: storagePath,
      data: persistedState,
    });
  },

  // 加载状态
  async loadState(
    workspaceId: string,
  ): Promise<PersistedWorkspaceState | null> {
    const storagePath = await this.getStoragePath(workspaceId);

    try {
      const data = await invoke<PersistedWorkspaceState>('read_json_file', {
        path: storagePath,
      });

      // 版本检查
      if (data.version !== 1) {
        console.warn('Unsupported workspace state version:', data.version);
        return null;
      }

      return data;
    } catch (error) {
      // 文件不存在或解析失败
      console.log('Failed to load workspace state:', error);
      return null;
    }
  },

  // 删除状态
  async deleteState(workspaceId: string): Promise<void> {
    const storagePath = await this.getStoragePath(workspaceId);

    try {
      await invoke('delete_node', { path: storagePath });
    } catch {
      // 文件可能不存在，忽略错误
    }
  },

  // 保存当前状态（供 actions 调用）
  async saveCurrentState(): Promise<void> {
    const { useWorkspaceStore } =
      await import('../../state/slices/workspaceSlice');
    const state = useWorkspaceStore.getState();

    // 如果没有打开的文件夹，不需要保存
    if (state.folders.length === 0) {
      return;
    }

    // 为工作区生成 ID（基于第一个文件夹路径）
    const primaryPath = state.folders[0]?.path;
    if (!primaryPath) {
      return;
    }

    const workspaceId = this.generateId(primaryPath);

    await this.saveState(workspaceId, {
      folders: state.folders,
      openFiles: state.openFiles,
      activeFile: state.activeFile,
    });
  },

  // 加载最近的工作区状态
  async loadRecentState(
    workspacePath: string,
  ): Promise<PersistedWorkspaceState | null> {
    const workspaceId = this.generateId(workspacePath);
    return this.loadState(workspaceId);
  },

  // 清除缓存（用于测试）
  clearCache(): void {
    cachedConfigDir = null;
  },
};
