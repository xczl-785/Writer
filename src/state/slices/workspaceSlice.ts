// src/state/slices/workspaceSlice.ts
// V6 工作区状态模型 - 支持多文件夹工作区

import { create } from 'zustand';

export interface WorkspaceFolder {
  path: string; // 绝对路径
  name?: string; // 可选显示名
  index: number; // 排序索引
}

export interface WorkspaceState {
  // 核心状态 - 单一事实来源
  folders: WorkspaceFolder[];

  // 工作区文件路径（如已保存）
  workspaceFile: string | null;

  // 脏标记（无标题工作区有未保存变更）
  isDirty: boolean;

  // 打开的文件
  openFiles: string[];

  // 当前活动文件
  activeFile: string | null;
}

// 计算属性（通过 selector 使用）
export const getWorkspaceType = (state: WorkspaceState): WorkspaceType => {
  if (state.folders.length === 0) return 'empty';
  if (state.folders.length === 1) return 'single';
  return 'multi';
};

export const isUntitledWorkspace = (state: WorkspaceState): boolean => {
  return state.folders.length > 1 && state.workspaceFile === null;
};

export type WorkspaceType = 'empty' | 'single' | 'multi';

export interface WorkspaceActions {
  // 基础操作
  setWorkspaceFile: (path: string | null) => void;
  setDirty: (dirty: boolean) => void;

  // 文件夹管理
  addFolder: (folder: WorkspaceFolder) => void;
  removeFolder: (path: string) => void;
  renameFolder: (path: string, name: string) => void;
  reorderFolders: (fromIndex: number, toIndex: number) => void;

  // 文件操作
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  removePath: (path: string) => void;

  // 状态恢复
  restoreState: (state: Partial<WorkspaceState>) => void;
  clearState: () => void;
}

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>(
  (set) => ({
    // 初始状态
    folders: [],
    workspaceFile: null,
    isDirty: false,
    openFiles: [],
    activeFile: null,

    // ========== 基础操作 ==========

    setWorkspaceFile: (path) =>
      set({
        workspaceFile: path,
        isDirty: false,
      }),

    setDirty: (dirty) => set({ isDirty: dirty }),

    // ========== 文件夹管理 ==========

    addFolder: (folder) =>
      set((state) => ({
        folders: [...state.folders, folder],
        isDirty: true,
      })),

    removeFolder: (path) =>
      set((state) => ({
        folders: state.folders.filter((f) => f.path !== path),
        isDirty: true,
      })),

    renameFolder: (path, name) =>
      set((state) => ({
        folders: state.folders.map((f) =>
          f.path === path ? { ...f, name } : f,
        ),
        isDirty: true,
      })),

    reorderFolders: (fromIndex, toIndex) =>
      set((state) => {
        const newFolders = [...state.folders];
        const [removed] = newFolders.splice(fromIndex, 1);
        newFolders.splice(toIndex, 0, removed);

        // 更新索引
        newFolders.forEach((folder, index) => {
          folder.index = index;
        });

        return {
          folders: newFolders,
          isDirty: true,
        };
      }),

    // ========== 文件操作 ==========

    openFile: (path) =>
      set((state) => {
        if (state.openFiles.includes(path)) {
          return { activeFile: path };
        }
        return {
          openFiles: [...state.openFiles, path],
          activeFile: path,
        };
      }),

    closeFile: (path) =>
      set((state) => {
        const newOpenFiles = state.openFiles.filter((f) => f !== path);
        let newActiveFile = state.activeFile;
        if (state.activeFile === path) {
          newActiveFile =
            newOpenFiles.length > 0
              ? newOpenFiles[newOpenFiles.length - 1]
              : null;
        }
        return {
          openFiles: newOpenFiles,
          activeFile: newActiveFile,
        };
      }),

    setActiveFile: (path) => set({ activeFile: path }),

    renameFile: (oldPath, newPath) =>
      set((state) => {
        const replacePath = (f: string) => {
          if (f === oldPath) return newPath;
          if (f.startsWith(oldPath + '/')) {
            return newPath + f.slice(oldPath.length);
          }
          return f;
        };

        return {
          openFiles: state.openFiles.map(replacePath),
          activeFile: state.activeFile ? replacePath(state.activeFile) : null,
        };
      }),

    removePath: (path) =>
      set((state) => {
        const isMatch = (f: string) => f === path || f.startsWith(path + '/');

        const newOpenFiles = state.openFiles.filter((f) => !isMatch(f));
        let newActiveFile = state.activeFile;
        if (state.activeFile && isMatch(state.activeFile)) {
          newActiveFile =
            newOpenFiles.length > 0
              ? newOpenFiles[newOpenFiles.length - 1]
              : null;
        }
        return {
          openFiles: newOpenFiles,
          activeFile: newActiveFile,
        };
      }),

    // ========== 状态恢复 ==========

    restoreState: (partialState) => set(partialState),

    clearState: () =>
      set({
        folders: [],
        workspaceFile: null,
        isDirty: false,
        openFiles: [],
        activeFile: null,
      }),
  }),
);
