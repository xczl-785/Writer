import { Editor } from '@tiptap/react';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { FsService } from '../../services/fs/FsService';
import { useStatusStore } from '../../state/slices/statusSlice';
import { ImageResolver } from '../../services/images/ImageResolver';
import { ErrorService } from '../../services/error/ErrorService';
import { EDITOR_CONFIG } from '../../config/editor';
import { joinPath, getRelativePath } from '../../utils/pathUtils';

const shouldShowImageRenderDiagnostic = (): boolean =>
  import.meta.env?.VITE_SHOW_IMAGE_DIAGNOSTIC === '1';

export const generateUniqueFilename = async (
  baseDir: string,
  baseName: string,
  extension: string,
): Promise<string> => {
  const fullPath = joinPath(baseDir, `${baseName}.${extension}`);
  const exists = await FsService.checkExists(fullPath);

  if (!exists) {
    return fullPath;
  }

  let i = 1;
  while (true) {
    const newPath = joinPath(baseDir, `${baseName}-${i}.${extension}`);
    const newExists = await FsService.checkExists(newPath);
    if (!newExists) {
      return newPath;
    }
    i++;
  }
};

export const useImagePaste = (editor: Editor | null = null) => {
  const { activeFile, folders } = useWorkspaceStore();
  const currentPath = folders[0]?.path;

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
          useStatusStore
            .getState()
            .setStatus('error', 'Failed to paste image: unsupported format');
          continue;
        }
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > EDITOR_CONFIG.image.maxUploadBytes) {
          ErrorService.log(file.size, 'Image too large (max 10MB)');
          useStatusStore
            .getState()
            .setStatus(
              'error',
              'Failed to paste image: image too large (max 10MB)',
            );
          continue;
        }

        event.preventDefault();

        const extension = file.type.split('/')[1] || 'png';
        const now = new Date();
        const timestamp =
          now.getFullYear().toString() +
          (now.getMonth() + 1).toString().padStart(2, '0') +
          now.getDate().toString().padStart(2, '0') +
          '-' +
          now.getHours().toString().padStart(2, '0') +
          now.getMinutes().toString().padStart(2, '0') +
          now.getSeconds().toString().padStart(2, '0');

        const baseName = `image-${timestamp}`;
        const assetsDir = joinPath(currentPath, 'assets');
        const imagePath = await generateUniqueFilename(
          assetsDir,
          baseName,
          extension,
        );

        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          await FsService.saveImage(imagePath, uint8Array);

          const relativePath = getRelativePath(activeFile, imagePath);
          const resolvedPath = ImageResolver.resolve(relativePath, activeFile);

          targetEditor.commands.setImage({ src: relativePath });

          if (shouldShowImageRenderDiagnostic()) {
            useStatusStore
              .getState()
              .setStatus(
                'idle',
                `Image src: ${relativePath} -> ${resolvedPath}`,
              );
          }
        } catch (error) {
          ErrorService.handle(
            error,
            'Failed to save image',
            'Failed to save image',
          );
        }
      }
    }

    return handled;
  };

  return { handlePaste };
};
