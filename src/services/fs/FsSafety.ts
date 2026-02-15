import { useEditorStore } from '../../state/slices/editorSlice';
import { AutosaveService } from '../autosave/AutosaveService';

export const FsSafety = {
  getAffectedDirtyFiles(path: string): string[] {
    const { fileStates } = useEditorStore.getState();
    return Object.keys(fileStates).filter((filePath) => {
      const isAffected = filePath === path || filePath.startsWith(`${path}/`);
      return isAffected && fileStates[filePath].isDirty;
    });
  },

  async flushAffectedFiles(path: string): Promise<boolean> {
    const affectedDirtyFiles = this.getAffectedDirtyFiles(path);
    if (affectedDirtyFiles.length === 0) {
      return true;
    }

    try {
      await Promise.all(
        affectedDirtyFiles.map((f) => AutosaveService.flush(f)),
      );
      return true;
    } catch (error) {
      console.error('Failed to flush affected files:', error);
      return false;
    }
  },
};
