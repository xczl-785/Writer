import { create } from 'zustand';

export interface CursorPosition {
  line: number;
  column: number;
}

export interface FileEditorState {
  content: string;
  cursor: CursorPosition;
  isDirty: boolean;
}

export interface EditorState {
  fileStates: Record<string, FileEditorState>;
}

export interface EditorActions {
  initializeFile: (path: string, content: string) => void;
  updateFileContent: (path: string, content: string) => void;
  updateCursor: (path: string, cursor: CursorPosition) => void;
  setDirty: (path: string, isDirty: boolean) => void;
  closeFileState: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  removePath: (path: string) => void;
}

export const useEditorStore = create<EditorState & EditorActions>((set) => ({
  fileStates: {},

  initializeFile: (path, content) =>
    set((state) => ({
      fileStates: {
        ...state.fileStates,
        [path]: {
          content,
          cursor: { line: 0, column: 0 },
          isDirty: false,
        },
      },
    })),

  updateFileContent: (path, content) =>
    set((state) => {
      const fileState = state.fileStates[path];
      if (!fileState) return state;
      return {
        fileStates: {
          ...state.fileStates,
          [path]: { ...fileState, content, isDirty: true },
        },
      };
    }),

  updateCursor: (path, cursor) =>
    set((state) => {
      const fileState = state.fileStates[path];
      if (!fileState) return state;
      return {
        fileStates: {
          ...state.fileStates,
          [path]: { ...fileState, cursor },
        },
      };
    }),

  setDirty: (path, isDirty) =>
    set((state) => {
      const fileState = state.fileStates[path];
      if (!fileState) return state;
      return {
        fileStates: {
          ...state.fileStates,
          [path]: { ...fileState, isDirty },
        },
      };
    }),

  closeFileState: (path) =>
    set((state) => {
      const remaining = { ...state.fileStates };
      delete remaining[path];
      return { fileStates: remaining };
    }),

  renameFile: (oldPath, newPath) =>
    set((state) => {
      const fileState = state.fileStates[oldPath];
      if (!fileState) return state;
      const newFileStates = { ...state.fileStates };
      delete newFileStates[oldPath];
      newFileStates[newPath] = fileState;
      return { fileStates: newFileStates };
    }),

  removePath: (path) =>
    set((state) => {
      const newFileStates = { ...state.fileStates };
      let changed = false;
      Object.keys(newFileStates).forEach((f) => {
        if (f === path || f.startsWith(`${path}/`)) {
          delete newFileStates[f];
          changed = true;
        }
      });
      return changed ? { fileStates: newFileStates } : state;
    }),
}));
