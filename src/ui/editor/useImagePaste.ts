import { Editor } from '@tiptap/react';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { FsService } from '../../services/fs/FsService';
import { useStatusStore } from '../../state/slices/statusSlice';
import { ImageResolver } from '../../services/images/ImageResolver';

const shouldShowImageRenderDiagnostic = (): boolean =>
  import.meta.env?.VITE_SHOW_IMAGE_DIAGNOSTIC === '1';

export const generateUniqueFilename = async (
  baseDir: string,
  baseName: string,
  extension: string,
): Promise<string> => {
  const fullPath = `${baseDir}/${baseName}.${extension}`;
  const exists = await FsService.checkExists(fullPath);

  if (!exists) {
    return fullPath;
  }

  let i = 1;
  while (true) {
    const newPath = `${baseDir}/${baseName}-${i}.${extension}`;
    const newExists = await FsService.checkExists(newPath);
    if (!newExists) {
      return newPath;
    }
    i++;
  }
};

export const useImagePaste = (editor: Editor | null = null) => {
  const { activeFile, currentPath } = useWorkspaceStore();

  const handlePaste = async (
    event: ClipboardEvent,
    targetEditor: Editor | null = editor,
  ): Promise<boolean> => {
    if (!targetEditor || !activeFile || !currentPath) return false;

    const items = event.clipboardData?.items;
    if (!items) return false;

    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
    let handled = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        handled = true;
        if (!ALLOWED_TYPES.includes(item.type)) {
          console.error(`Unsupported image format: ${item.type}`);
          useStatusStore
            .getState()
            .setStatus('error', 'Unsupported image format');
          continue;
        }
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > 10 * 1024 * 1024) {
          console.error('Image too large (max 10MB)');
          useStatusStore
            .getState()
            .setStatus('error', 'Image too large (max 10MB)');
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
        const assetsDir = `${currentPath}/assets`;
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
          console.error('Failed to save image:', error);
          useStatusStore.getState().setStatus('error', 'Failed to save image');
        }
      }
    }

    return handled;
  };

  return { handlePaste };
};

export const getRelativePath = (from: string, to: string): string => {
  const normalize = (p: string) => p.replace(/\\/g, '/');
  const fromParts = normalize(from).split('/').filter(Boolean);
  const toParts = normalize(to).split('/').filter(Boolean);

  fromParts.pop();

  let commonIndex = 0;

  while (
    commonIndex < fromParts.length &&
    commonIndex < toParts.length &&
    fromParts[commonIndex] === toParts[commonIndex]
  ) {
    commonIndex++;
  }

  const upCount = fromParts.length - commonIndex;
  const upParts = Array(upCount).fill('..');
  const downParts = toParts.slice(commonIndex);

  const result = [...upParts, ...downParts].join('/');
  if (result.startsWith('.')) {
    return result;
  }
  return './' + result;
};
