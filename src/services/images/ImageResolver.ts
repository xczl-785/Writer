import { convertFileSrc } from '@tauri-apps/api/core';

export const ImageResolver = {
  resolve(src: string, activeFilePath: string | null): string {
    if (!src) return src;

    // Handle absolute/http/data/blob/asset URLs safely
    if (
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('data:') ||
      src.startsWith('blob:') ||
      src.startsWith('asset://')
    ) {
      return src;
    }

    // If it's already an absolute path (starts with / or C:\ etc), convert it
    if (src.startsWith('/') || /^[a-zA-Z]:\\/.test(src)) {
      try {
        return convertFileSrc(src);
      } catch (e) {
        console.error('Failed to convert absolute path to asset URL:', e);
        return src;
      }
    }

    // If we don't have an active file path, we can't resolve relative paths
    if (!activeFilePath) {
      return src;
    }

    try {
      // Resolve relative path
      const normalize = (p: string) => p.replace(/\\/g, '/');
      const normalizedActiveFile = normalize(activeFilePath);
      const parentDir = normalizedActiveFile.substring(
        0,
        normalizedActiveFile.lastIndexOf('/'),
      );

      const absolutePath = this.join(parentDir, src);
      return convertFileSrc(absolutePath);
    } catch (e) {
      console.error('Failed to resolve relative path to asset URL:', e);
      return src;
    }
  },

  join(base: string, relative: string): string {
    const normalize = (p: string) => p.replace(/\\/g, '/');
    const baseParts = normalize(base).split('/').filter(Boolean);
    const relativeParts = normalize(relative).split('/').filter(Boolean);

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
