// Workspace store for the workspace domain
// V6 工作区状态模型 - 支持多文件夹工作区

import { create } from 'zustand';

export interface WorkspaceFolder {
  path: string;
  name?: string;
  index: number;
}

export interface WorkspaceState {
  folders: WorkspaceFolder[];
  workspaceFile: string | null;
  isDirty: boolean;
  openFiles: string[];
  activeFile: string | null;
}

export type WorkspaceType = 'empty' | 'single' | 'multi';

export type WorkspaceContext =
  | 'none'
  | 'single-temporary'
  | 'multi-unsaved'
  | 'saved'
  | 'saved-empty';

export function getWorkspaceType(state: WorkspaceState): WorkspaceType {
  if (state.folders.length === 0) return 'empty';
  if (state.folders.length === 1) return 'single';
  return 'multi';
}

export function getWorkspaceContext(
  state: WorkspaceState,
): WorkspaceContext {
  if (state.workspaceFile) {
    if (state.folders.length === 0) {
      return 'saved-empty';
    }
    return 'saved';
  }

  if (state.folders.length === 0) {
    return 'none';
  }

  if (state.folders.length === 1) {
    return 'single-temporary';
  }

  return 'multi-unsaved';
}

export function hasWorkspaceContext(state: WorkspaceState): boolean {
  return getWorkspaceContext(state) !== 'none';
}

export function isSavedWorkspace(state: WorkspaceState): boolean {
  const context = getWorkspaceContext(state);
  return context === 'saved' || context === 'saved-empty';
}

export function isEmptySavedWorkspace(state: WorkspaceState): boolean {
  return getWorkspaceContext(state) === 'saved-empty';
}

export function isUntitledWorkspace(state: WorkspaceState): boolean {
  return getWorkspaceContext(state) === 'multi-unsaved';
}

export interface WorkspaceActions {
  setWorkspaceFile: (path: string | null) => void;
  setDirty: (dirty: boolean) => void;
  addFolder: (folder: WorkspaceFolder) => void;
  removeFolder: (path: string) => void;
  renameFolder: (path: string, name: string) => void;
  reorderFolders: (fromIndex: number, toIndex: number) => void;
  moveFolderUp: (path: string) => void;
  moveFolderDown: (path: string) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  removePath: (path: string) => void;
  restoreState: (state: Partial<WorkspaceState>) => void;
  clearState: () => void;
}

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>(
  (set) => ({
    folders: [],
    workspaceFile: null,
    isDirty: false,
    openFiles: [],
    activeFile: null,

    setWorkspaceFile: (path) =>
      set({
        workspaceFile: path,
        isDirty: false,
      }),

    setDirty: (dirty) => set({ isDirty: dirty }),

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

        newFolders.forEach((folder, index) => {
          folder.index = index;
        });

        return {
          folders: newFolders,
          isDirty: true,
        };
      }),

    moveFolderUp: (path) =>
      set((state) => {
        const index = state.folders.findIndex((f) => f.path === path);
        if (index <= 0) return state;

        const newFolders = [...state.folders];
        [newFolders[index - 1], newFolders[index]] = [
          newFolders[index],
          newFolders[index - 1],
        ];

        newFolders.forEach((folder, idx) => {
          folder.index = idx;
        });

        return {
          folders: newFolders,
          isDirty: true,
        };
      }),

    moveFolderDown: (path) =>
      set((state) => {
        const index = state.folders.findIndex((f) => f.path === path);
        if (index < 0 || index >= state.folders.length - 1) return state;

        const newFolders = [...state.folders];
        [newFolders[index], newFolders[index + 1]] = [
          newFolders[index + 1],
          newFolders[index],
        ];

        newFolders.forEach((folder, idx) => {
          folder.index = idx;
        });

        return {
          folders: newFolders,
          isDirty: true,
        };
      }),

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
        const replacePath = (filePath: string): string => {
          if (filePath === oldPath) return newPath;
          if (filePath.startsWith(oldPath + '/')) {
            return newPath + filePath.slice(oldPath.length);
          }
          return filePath;
        };

        return {
          openFiles: state.openFiles.map(replacePath),
          activeFile: state.activeFile ? replacePath(state.activeFile) : null,
        };
      }),

    removePath: (path) =>
      set((state) => {
        const isMatch = (filePath: string): boolean =>
          filePath === path || filePath.startsWith(path + '/');

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
