import { create } from 'zustand';

export interface WorkspaceState {
  currentPath: string | null;
  openFiles: string[];
  activeFile: string | null;
}

export interface WorkspaceActions {
  setWorkspacePath: (path: string | null) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  removePath: (path: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>(
  (set) => ({
    currentPath: null,
    openFiles: [],
    activeFile: null,

    setWorkspacePath: (path) => set({ currentPath: path }),

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
      set((state) => ({
        openFiles: state.openFiles.map((f) => (f === oldPath ? newPath : f)),
        activeFile: state.activeFile === oldPath ? newPath : state.activeFile,
      })),

    removePath: (path) =>
      set((state) => {
        const isMatch = (f: string) => f === path || f.startsWith(`${path}/`);
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
  }),
);
