import { convertFileSrc } from '@tauri-apps/api/core';
import { ErrorService } from '../error/ErrorService';
import {
  normalizePath,
  getParentPath,
  splitPath,
} from '../../shared/utils/pathUtils';

export const ImageResolver = {
  resolve(src: string, activeFilePath: string | null): string {
    if (!src) return src;

    if (
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('data:') ||
      src.startsWith('blob:') ||
      src.startsWith('asset://')
    ) {
      return src;
    }

    if (src.startsWith('/') || /^[a-zA-Z]:\\/.test(src)) {
      try {
        return convertFileSrc(src);
      } catch (e) {
        ErrorService.log(e, 'Failed to convert absolute path to asset URL');
        return src;
      }
    }

    if (!activeFilePath) {
      return src;
    }

    try {
      const normalizedActiveFile = normalizePath(activeFilePath);
      const parentDir = getParentPath(normalizedActiveFile);

      const absolutePath = this.join(parentDir, src);
      return convertFileSrc(absolutePath);
    } catch (e) {
      ErrorService.log(e, 'Failed to resolve relative path to asset URL');
      return src;
    }
  },

  join(base: string, relative: string): string {
    const baseParts = splitPath(base);
    const relativeParts = splitPath(relative);

    for (const part of relativeParts) {
      if (part === '..') {
        baseParts.pop();
      } else if (part !== '.') {
        baseParts.push(part);
      }
    }

    const result = baseParts.join('/');
    return base.startsWith('/') ? '/' + result : result;
  },
};
