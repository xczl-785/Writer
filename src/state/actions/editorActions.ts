import { useEditorStore } from '../slices/editorSlice';

export const editorActions = {
  initializeFile(path: string, content: string): void {
    useEditorStore.getState().initializeFile(path, content);
  },

  updateContent(path: string, content: string): void {
    useEditorStore.getState().updateFileContent(path, content);
  },

  closeFile(path: string): void {
    useEditorStore.getState().closeFileState(path);
  },
};
