import { create } from 'zustand';
import type { FileNode } from '../types';

export interface FileTreeState {
  nodes: FileNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
}

export interface FileTreeActions {
  setNodes: (nodes: FileNode[]) => void;
  setSelectedPath: (path: string | null) => void;
  expandNode: (path: string) => void;
  collapseNode: (path: string) => void;
}

export const useFileTreeStore = create<FileTreeState & FileTreeActions>(
  (set) => ({
    nodes: [],
    expandedPaths: new Set(),
    selectedPath: null,

    setNodes: (nodes) => set({ nodes }),

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
  }),
);
