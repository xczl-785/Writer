// src/state/slices/dropSlice.ts
// V6.1 单文件拖拽 - 操作锁状态管理

import { create } from 'zustand';

/**
 * 操作锁状态
 */
export interface DropState {
  /** 是否有操作正在进行 */
  isOperationInProgress: boolean;
  /** 操作描述（用于调试和日志） */
  operationDescription: string | null;
  /** 操作开始时间（用于超时检测） */
  operationStartTime: number | null;
}

/**
 * 操作锁 Actions
 */
export interface DropActions {
  /**
   * 开始操作（获取锁）
   * @param description - 操作描述
   * @returns 是否成功获取锁（false 表示已有其他操作在进行）
   */
  startOperation: (description?: string) => boolean;
  /**
   * 结束操作（释放锁）
   */
  endOperation: () => void;
  /**
   * 重置状态（用于测试或异常恢复）
   */
  reset: () => void;
  /**
   * 检查超时（用于自动释放长时间占用）
   * @param timeoutMs - 超时时间（毫秒），默认 10000ms
   * @returns 是否因超时而释放
   */
  checkTimeout: (timeoutMs?: number) => boolean;
}

const initialState: DropState = {
  isOperationInProgress: false,
  operationDescription: null,
  operationStartTime: null,
};

/**
 * 操作锁 Store
 *
 * 用于管理单文件拖拽操作的并发控制，防止多个拖拽操作同时进行导致状态混乱
 */
export const useDropStore = create<DropState & DropActions>((set, get) => ({
  ...initialState,

  startOperation: (description = 'File drop operation') => {
    const state = get();

    // 检查是否已有操作在进行
    if (state.isOperationInProgress) {
      console.warn(
        '[DropStore] Operation already in progress:',
        state.operationDescription,
      );
      return false; // 返回失败标志
    }

    // 设置操作锁
    set({
      isOperationInProgress: true,
      operationDescription: description,
      operationStartTime: Date.now(),
    });

    console.debug('[DropStore] Operation started:', description);
    return true; // 返回成功标志
  },

  endOperation: () => {
    const state = get();

    if (!state.isOperationInProgress) {
      console.warn(
        '[DropStore] endOperation called but no operation is in progress',
      );
      return;
    }

    console.debug('[DropStore] Operation ended:', state.operationDescription);
    set({
      isOperationInProgress: false,
      operationDescription: null,
      operationStartTime: null,
    });
  },

  reset: () => {
    console.debug('[DropStore] State reset');
    set(initialState);
  },

  checkTimeout: (timeoutMs = 10000) => {
    const state = get();

    if (!state.isOperationInProgress || !state.operationStartTime) {
      return false;
    }

    const elapsed = Date.now() - state.operationStartTime;

    if (elapsed >= timeoutMs) {
      console.warn(
        '[DropStore] Operation timeout (>{}ms):',
        timeoutMs,
        state.operationDescription,
      );
      get().endOperation();
      return true;
    }

    return false;
  },
}));

/**
 * 启动超时检查器
 *
 * 在应用初始化时调用，定期检查操作锁是否超时
 * @param intervalMs - 检查间隔（毫秒），默认 2000ms
 * @param timeoutMs - 超时时间（毫秒），默认 10000ms
 * @returns 清理函数（用于在组件卸载时停止检查器）
 */
export function startDropOperationTimeoutChecker(
  intervalMs = 2000,
  timeoutMs = 10000,
): () => void {
  const intervalId = setInterval(() => {
    useDropStore.getState().checkTimeout(timeoutMs);
  }, intervalMs);

  // 返回清理函数
  return () => clearInterval(intervalId);
}
