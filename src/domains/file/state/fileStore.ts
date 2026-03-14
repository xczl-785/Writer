// File tree store for the file domain
// V6 文件树状态模型 - 支持多根文件夹

import { create } from 'zustand';
import type { FileNode } from '../../../state/types';

export interface RootFolderNode {
  workspacePath: string; // 绝对路径
  displayName: string; // 用户指定或 basename
  tree: FileNode[]; // 该文件夹的文件树
}

export interface FileTreeState {
  rootFolders: RootFolderNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;

  // 加载状态和错误管理
  loadingPaths: Set<string>;
  errorPaths: Map<string, string>;

  // 被外部删除的文件路径
  deletedPaths: Set<string>;
}

export interface FileTreeActions {
  // 根文件夹管理
  setRootFolders: (folders: RootFolderNode[]) => void;
  addRootFolder: (folder: RootFolderNode) => void;
  removeRootFolder: (path: string) => void;
  updateRootFolderName: (path: string, name: string) => void;
  moveRootFolderUp: (path: string) => void;
  moveRootFolderDown: (path: string) => void;

  // 树节点操作
  setNodes: (path: string, nodes: FileNode[]) => void;

  // 展开/折叠
  setSelectedPath: (path: string | null) => void;
  expandNode: (path: string) => void;
  collapseNode: (path: string) => void;
  toggleNode: (path: string) => void;

  // 加载状态
  setLoadingPath: (path: string, loading: boolean) => void;
  setErrorPath: (path: string, error: string | null) => void;

  // 删除标记
  markAsDeleted: (path: string) => void;
  clearDeletedPath: (path: string) => void;

  // 状态恢复
  clearState: () => void;
}

export const useFileTreeStore = create<FileTreeState & FileTreeActions>(
  (set) => ({
    // 初始状态
    rootFolders: [],
    expandedPaths: new Set(),
    selectedPath: null,
    loadingPaths: new Set(),
    errorPaths: new Map(),
    deletedPaths: new Set(),

    // ========== 根文件夹管理 ==========

    setRootFolders: (folders) => set({ rootFolders: folders }),

    addRootFolder: (folder) =>
      set((state) => ({
        rootFolders: [...state.rootFolders, folder],
      })),

    removeRootFolder: (path) =>
      set((state) => ({
        rootFolders: state.rootFolders.filter((f) => f.workspacePath !== path),
      })),

    updateRootFolderName: (path, name) =>
      set((state) => ({
        rootFolders: state.rootFolders.map((f) =>
          f.workspacePath === path ? { ...f, displayName: name } : f,
        ),
      })),

    moveRootFolderUp: (path) =>
      set((state) => {
        const index = state.rootFolders.findIndex(
          (f) => f.workspacePath === path,
        );
        if (index <= 0) return state;

        const newRootFolders = [...state.rootFolders];
        [newRootFolders[index - 1], newRootFolders[index]] = [
          newRootFolders[index],
          newRootFolders[index - 1],
        ];

        return { rootFolders: newRootFolders };
      }),

    moveRootFolderDown: (path) =>
      set((state) => {
        const index = state.rootFolders.findIndex(
          (f) => f.workspacePath === path,
        );
        if (index < 0 || index >= state.rootFolders.length - 1) return state;

        const newRootFolders = [...state.rootFolders];
        [newRootFolders[index], newRootFolders[index + 1]] = [
          newRootFolders[index + 1],
          newRootFolders[index],
        ];

        return { rootFolders: newRootFolders };
      }),

    // ========== 树节点操作 ==========

    setNodes: (path, nodes) =>
      set((state) => ({
        rootFolders: state.rootFolders.map((f) =>
          f.workspacePath === path ? { ...f, tree: nodes } : f,
        ),
      })),

    // ========== 展开/折叠 ==========

    setSelectedPath: (path) => set({ selectedPath: path }),

    expandNode: (path) =>
      set((state) => {
        const newExpanded = new Set(state.expandedPaths);
        newExpanded.add(path);
        return { expandedPaths: newExpanded };
      }),

    collapseNode: (path) =>
      set((state) => {
        const newExpanded = new Set(state.expandedPaths);
        newExpanded.delete(path);
        return { expandedPaths: newExpanded };
      }),

    toggleNode: (path) =>
      set((state) => {
        const newExpanded = new Set(state.expandedPaths);
        if (newExpanded.has(path)) {
          newExpanded.delete(path);
        } else {
          newExpanded.add(path);
        }
        return { expandedPaths: newExpanded };
      }),

    // ========== 加载状态 ==========

    setLoadingPath: (path, loading) =>
      set((state) => {
        const newLoading = new Set(state.loadingPaths);
        if (loading) {
          newLoading.add(path);
        } else {
          newLoading.delete(path);
        }
        return { loadingPaths: newLoading };
      }),

    setErrorPath: (path, error) =>
      set((state) => {
        const newErrors = new Map(state.errorPaths);
        if (error) {
          newErrors.set(path, error);
        } else {
          newErrors.delete(path);
        }
        return { errorPaths: newErrors };
      }),

    // ========== 删除标记 ==========

    markAsDeleted: (path) =>
      set((state) => {
        const newDeleted = new Set(state.deletedPaths);
        newDeleted.add(path);
        return { deletedPaths: newDeleted };
      }),

    clearDeletedPath: (path) =>
      set((state) => {
        const newDeleted = new Set(state.deletedPaths);
        newDeleted.delete(path);
        return { deletedPaths: newDeleted };
      }),

    // ========== 状态恢复 ==========

    clearState: () =>
      set({
        rootFolders: [],
        expandedPaths: new Set(),
        selectedPath: null,
        loadingPaths: new Set(),
        errorPaths: new Map(),
        deletedPaths: new Set(),
      }),
  }),
);
