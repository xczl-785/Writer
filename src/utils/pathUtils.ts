const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdx'];

export const normalizePath = (path: string): string => {
  return path.replace(/\\/g, '/');
};

export const getParentPath = (path: string): string => {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) {
    return '';
  }
  return normalized.slice(0, lastSlash);
};

export const joinPath = (...segments: string[]): string => {
  if (segments.length === 0) return '';

  const firstSegment = normalizePath(segments[0]);
  const isAbsolute = firstSegment.startsWith('/');

  const normalized = segments
    .map((s) => normalizePath(s).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);

  const result = normalized.join('/');
  return isAbsolute ? '/' + result : result;
};

export const isChildPath = (parent: string, child: string): boolean => {
  const normalizedParent = normalizePath(parent);
  const normalizedChild = normalizePath(child);
  return normalizedChild.startsWith(normalizedParent + '/');
};

export const isPathMatch = (target: string, path: string): boolean => {
  const normalizedTarget = normalizePath(target);
  const normalizedPath = normalizePath(path);
  return (
    normalizedPath === normalizedTarget ||
    normalizedPath.startsWith(normalizedTarget + '/')
  );
};

export const getRelativePath = (from: string, to: string): string => {
  const fromParts = normalizePath(from).split('/').filter(Boolean);
  const toParts = normalizePath(to).split('/').filter(Boolean);

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

export const splitPath = (path: string): string[] => {
  return normalizePath(path).split('/').filter(Boolean);
};

export const getBasename = (path: string): string => {
  const parts = splitPath(path);
  return parts[parts.length - 1] || '';
};

export const getFileExtension = (fileName: string): string => {
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0 || idx === fileName.length - 1) {
    return '';
  }
  return fileName.slice(idx);
};

export const isMarkdownFile = (fileName: string): boolean => {
  const ext = getFileExtension(fileName).toLowerCase();
  return MARKDOWN_EXTENSIONS.includes(ext);
};

export const trimTrailingSeparator = (path: string): string => {
  const normalized = normalizePath(path);
  if (normalized === '/') {
    return '/';
  }
  return normalized.replace(/\/+$/g, '');
};

export const ensureTrailingSlash = (path: string): string => {
  const normalized = normalizePath(path);
  return normalized.endsWith('/') ? normalized : normalized + '/';
};

/**
 * Resolve a relative path from a base path to an absolute path.
 * @param basePath - The base file path (e.g., workspace file path)
 * @param relativePath - The relative path to resolve
 * @returns The resolved absolute path
 */
export const resolvePath = (basePath: string, relativePath: string): string => {
  const normalizedBase = normalizePath(basePath);
  const normalizedRelative = normalizePath(relativePath);

  // If already absolute, return as-is
  if (normalizedRelative.startsWith('/')) {
    return normalizedRelative;
  }

  // Get the directory of the base path
  const lastSlash = normalizedBase.lastIndexOf('/');
  const baseDir = lastSlash > 0 ? normalizedBase.slice(0, lastSlash) : '';

  // Split relative path into parts
  const relativeParts = normalizedRelative.split('/').filter(Boolean);
  const baseParts = baseDir.split('/').filter(Boolean);

  // Process each part
  for (const part of relativeParts) {
    if (part === '..') {
      baseParts.pop();
    } else if (part !== '.') {
      baseParts.push(part);
    }
  }

  return '/' + baseParts.join('/');
};

/**
 * Check if a path is relative (starts with ./ or ../ or is a plain relative path)
 */
export const isRelativePath = (path: string): boolean => {
  const normalized = normalizePath(path);
  return (
    normalized.startsWith('./') ||
    normalized.startsWith('../') ||
    (!normalized.startsWith('/') && normalized.includes('/'))
  );
};
