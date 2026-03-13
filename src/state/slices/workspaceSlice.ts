import { create } from 'zustand';
import { isChildPath, isPathMatch } from '../../utils/pathUtils';

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

export interface WorkspaceActions {
  addFolder: (folder: WorkspaceFolder) => void;
  removeFolder: (path: string) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  removePath: (path: string) => void;
  setDirty: (dirty: boolean) => void;
}

// 计算属性（通过 selector）
export const getWorkspaceType = (
  state: WorkspaceState,
): 'empty' | 'single' | 'multi' => {
  if (state.folders.length === 0) return 'empty';
  if (state.folders.length === 1) return 'single';
  return 'multi';
};

export const isUntitledWorkspace = (state: WorkspaceState): boolean => {
  return state.folders.length > 1 && state.workspaceFile === null;
};

// 获取第一个文件夹路径（向后兼容）
export const getCurrentPath = (state: WorkspaceState): string | null => {
  return state.folders[0]?.path ?? null;
};

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>(
  (set) => ({
    folders: [],
    workspaceFile: null,
    isDirty: false,
    openFiles: [],
    activeFile: null,

    addFolder: (folder) =>
      set((state) => {
        if (state.folders.some((f) => f.path === folder.path)) {
          return state;
        }
        return {
          folders: [
            ...state.folders,
            { ...folder, index: folder.index ?? state.folders.length },
          ],
        };
      }),

    removeFolder: (path) =>
      set((state) => ({
        folders: state.folders.filter((f) => f.path !== path),
      })),

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
          if (isChildPath(oldPath, f)) {
            return f.replace(oldPath, newPath);
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
        const isMatch = (f: string) => isPathMatch(path, f);
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

    setDirty: (dirty) => set({ isDirty: dirty }),
  }),
);
