import type { Editor } from '@tiptap/react';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { FsService } from '../../services/fs/FsService';
import { useStatusStore } from '../../state/slices/statusSlice';
import { ImageResolver } from '../../services/images/ImageResolver';
import { ErrorService } from '../../services/error/ErrorService';
import { EDITOR_CONFIG } from '../../config/editor';
import { joinPath, getRelativePath } from '../../utils/pathUtils';

const shouldShowImageRenderDiagnostic = (): boolean =>
  import.meta.env?.VITE_SHOW_IMAGE_DIAGNOSTIC === '1';

export type ApplyImageActionResult =
  | 'applied'
  | 'cancelled'
  | 'failed'
  | 'unavailable';

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

const createImageFilePicker = (): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });

export async function saveAndInsertImageFile(
  editor: Editor,
  file: File,
  workspace: { activeFile: string | null; folders: { path: string }[] },
): Promise<Exclude<ApplyImageActionResult, 'cancelled'>> {
  const { activeFile, folders } = workspace;
  const currentPath = folders[0]?.path ?? null;
  if (!activeFile || !currentPath) {
    return 'unavailable';
  }

  const allowedTypes = EDITOR_CONFIG.image.allowedMimeTypes;
  if (!allowedTypes.some((type) => type === file.type)) {
    ErrorService.log(file.type, 'Unsupported image format');
    useStatusStore
      .getState()
      .setStatus('error', 'Failed to insert image: unsupported format');
    return 'failed';
  }

  if (file.size > EDITOR_CONFIG.image.maxUploadBytes) {
    ErrorService.log(file.size, 'Image too large (max 10MB)');
    useStatusStore
      .getState()
      .setStatus('error', 'Failed to insert image: image too large (max 10MB)');
    return 'failed';
  }

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

    editor.commands.setImage({ src: relativePath });

    if (shouldShowImageRenderDiagnostic()) {
      useStatusStore
        .getState()
        .setStatus('idle', `Image src: ${relativePath} -> ${resolvedPath}`);
    }

    return 'applied';
  } catch (error) {
    ErrorService.handle(error, 'Failed to save image', 'Failed to save image');
    return 'failed';
  }
}

export async function applyImageAction(
  editor: Editor,
  pickFile: () => Promise<File | null> = createImageFilePicker,
): Promise<ApplyImageActionResult> {
  const file = await pickFile();
  if (!file) {
    return 'cancelled';
  }

  return saveAndInsertImageFile(editor, file, useWorkspaceStore.getState());
}
