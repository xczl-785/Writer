import { create } from 'zustand';
import type { FileNode } from '../types';

export interface FileTreeState {
  nodes: FileNode[];
  expandedPaths: Set<string>;
}

export interface FileTreeActions {
  setNodes: (nodes: FileNode[]) => void;
  expandNode: (path: string) => void;
  collapseNode: (path: string) => void;
  toggleNode: (path: string) => void;
}

export const useFileTreeStore = create<FileTreeState & FileTreeActions>(
  (set) => ({
    nodes: [],
    expandedPaths: new Set(),

    setNodes: (nodes) => set({ nodes }),

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
  }),
);
