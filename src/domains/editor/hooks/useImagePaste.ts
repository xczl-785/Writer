import { Editor } from '@tiptap/react';
import { useWorkspaceStore } from '../../workspace/state/workspaceStore';
import { ErrorService } from '../../../services/error/ErrorService';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { EDITOR_CONFIG } from '../../../config/editor';
import { generateUniqueFilename, saveAndInsertImageFile } from './imageActions';
import { t } from '../../../shared/i18n';

export { generateUniqueFilename };

export const useImagePaste = (editor: Editor | null = null) => {
  const showLevel2PasteError = (
    error: unknown,
    source: string,
    reason: string,
    suggestion: string,
  ): void => {
    useStatusStore.getState().setStatus('idle', null);
    ErrorService.handleWithInfo(error, source, {
      level: 'level2',
      source,
      reason,
      suggestion,
      dedupeKey: source,
    });
  };

  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const folders = useWorkspaceStore((state) => state.folders);
  const currentPath = folders[0]?.path ?? null;

  const handlePaste = async (
    event: ClipboardEvent,
    targetEditor: Editor | null = editor,
  ): Promise<boolean> => {
    if (!targetEditor || !activeFile || !currentPath) return false;

    const items = event.clipboardData?.items;
    if (!items) return false;

    const allowedTypes = EDITOR_CONFIG.image.allowedMimeTypes;
    let handled = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        handled = true;
        if (!allowedTypes.some((type) => type === item.type)) {
          ErrorService.log(item.type, 'Unsupported image format');
          showLevel2PasteError(
            new Error(t('image.pasteUnsupported')),
            'editor-paste-image-format',
            t('image.pasteUnsupported'),
            t('image.pasteUnsupportedSuggestion'),
          );
          continue;
        }
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > EDITOR_CONFIG.image.maxUploadBytes) {
          ErrorService.log(file.size, 'Image too large (max 10MB)');
          showLevel2PasteError(
            new Error(t('image.pasteTooLarge')),
            'editor-paste-image-size',
            t('image.pasteTooLarge'),
            t('image.pasteTooLargeSuggestion'),
          );
          continue;
        }

        event.preventDefault();

        await saveAndInsertImageFile(targetEditor, file, {
          activeFile,
          folders,
        });
      }
    }

    return handled;
  };

  return { handlePaste };
};
