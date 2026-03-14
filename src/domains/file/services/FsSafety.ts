import { useEditorStore } from '../../editor/state/editorStore';
import { AutosaveService } from './AutosaveService';
import { ErrorService } from '../../../services/error/ErrorService';
import { isPathMatch } from '../../../utils/pathUtils';

export const FsSafety = {
  getAffectedDirtyFiles(path: string): string[] {
    const { fileStates } = useEditorStore.getState();
    return Object.keys(fileStates).filter((filePath) => {
      const isAffected = isPathMatch(path, filePath);
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
      ErrorService.log(error, 'Failed to flush affected files');
      return false;
    }
  },
};
