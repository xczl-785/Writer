/**
 * FileWatcherService - 文件系统变化监听服务
 * 订阅后端 writer://file-change 事件，实现外部文件变化感知
 */

import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { normalizePath } from '../../../utils/pathUtils';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'unlinkDir' | 'rename';
  path: string;
  oldPath?: string;
}

type ChangeCallback = (event: FileChangeEvent) => void;

interface FileWatcherServiceState {
  isWatching: boolean;
  currentPaths: string[];
  eventListeners: ChangeCallback[];
  debounceTimers: Map<string, ReturnType<typeof setTimeout>>;
  unlisten: (() => void) | null;
}

const state: FileWatcherServiceState = {
  isWatching: false,
  currentPaths: [],
  eventListeners: [],
  debounceTimers: new Map(),
  unlisten: null,
};

/**
 * 映射 notify 事件类型到前端统一格式
 */
function mapKind(kind: string): FileChangeEvent['type'] {
  const kindLower = kind.toLowerCase();
  if (kindLower.includes('create')) return 'add';
  if (kindLower.includes('modify')) return 'change';
  if (kindLower.includes('remove') || kindLower.includes('delete'))
    return 'unlink';
  if (kindLower.includes('rename')) return 'rename';
  return 'change';
}

/**
 * 映射后端事件到前端格式
 */
function mapEvent(payload: {
  kind: string;
  paths: string[];
}): FileChangeEvent[] {
  return payload.paths.map((path: string) => ({
    type: mapKind(payload.kind),
    path: normalizePath(path),
  }));
}

/**
 * 处理后端推送的事件（带防抖）
 */
function handleBackendEvent(payload: { kind: string; paths: string[] }): void {
  const events = mapEvent(payload);

  // 防抖处理（300ms）
  for (const event of events) {
    const existingTimer = state.debounceTimers.get(event.path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      for (const cb of state.eventListeners) {
        cb(event);
      }
      state.debounceTimers.delete(event.path);
    }, 300);

    state.debounceTimers.set(event.path, timer);
  }
}

/**
 * 清理所有防抖定时器
 */
function clearDebounceTimers(): void {
  for (const timer of state.debounceTimers.values()) {
    clearTimeout(timer);
  }
  state.debounceTimers.clear();
}

export const FileWatcherService = {
  /**
   * 开始监听工作区文件变化
   * @param workspaceFolders 要监听的工作区文件夹路径
   * @param onChange 文件变化回调函数
   */
  async startWatching(
    workspaceFolders: string[],
    onChange: ChangeCallback,
  ): Promise<void> {
    // 如果已经在监听，先停止
    if (state.isWatching) {
      await this.stopWatching();
    }

    // 注册事件监听器
    state.eventListeners.push(onChange);

    // 监听后端推送的事件
    const unlisten = await listen<{ kind: string; paths: string[] }>(
      'writer://file-change',
      (event) => {
        handleBackendEvent(event.payload);
      },
    );

    // 调用后端启动监听
    await invoke('start_watching', { paths: workspaceFolders });

    state.isWatching = true;
    state.currentPaths = workspaceFolders;
    state.unlisten = unlisten;
  },

  /**
   * 停止监听
   */
  async stopWatching(): Promise<void> {
    if (!state.isWatching) return;

    // 调用后端停止监听
    try {
      await invoke('stop_watching');
    } catch (error) {
      console.error('Failed to stop watching:', error);
    }

    // 清理事件监听器
    if (state.unlisten) {
      state.unlisten();
      state.unlisten = null;
    }

    // 清理状态
    state.isWatching = false;
    state.currentPaths = [];
    state.eventListeners = [];

    // 清理所有定时器
    clearDebounceTimers();
  },

  /**
   * 重新监听（工作区变更后）
   * @param newWorkspaceFolders 新的工作区文件夹路径
   * @param onChange 文件变化回调函数
   */
  async restartWatching(
    newWorkspaceFolders: string[],
    onChange: ChangeCallback,
  ): Promise<void> {
    await this.stopWatching();
    await this.startWatching(newWorkspaceFolders, onChange);
  },

  /**
   * 更新监听路径（不重新注册回调）
   */
  async updateWatchPaths(newPaths: string[]): Promise<void> {
    if (!state.isWatching) {
      return;
    }

    try {
      await invoke('update_watch_paths', { newPaths });
      state.currentPaths = newPaths;
    } catch (error) {
      console.error('Failed to update watch paths:', error);
    }
  },

  /**
   * 获取当前监听状态
   */
  getStatus(): {
    isWatching: boolean;
    paths: string[];
  } {
    return {
      isWatching: state.isWatching,
      paths: [...state.currentPaths],
    };
  },

  /**
   * 添加事件监听器
   */
  addEventListener(callback: ChangeCallback): void {
    state.eventListeners.push(callback);
  },

  /**
   * 移除事件监听器
   */
  removeEventListener(callback: ChangeCallback): void {
    const index = state.eventListeners.indexOf(callback);
    if (index !== -1) {
      state.eventListeners.splice(index, 1);
    }
  },
};

export default FileWatcherService;
