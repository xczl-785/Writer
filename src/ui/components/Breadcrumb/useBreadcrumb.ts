import {
  getBasename,
  joinPath,
  normalizePath,
  splitPath,
  trimTrailingSeparator,
} from '../../../shared/utils/pathUtils';

export interface BreadcrumbItem {
  id: string;
  name: string;
  type: 'workspace' | 'folder' | 'file';
  path: string;
}

export interface BreadcrumbSegment {
  type: 'item' | 'ellipsis';
  item?: BreadcrumbItem;
}

export interface BreadcrumbWorkspaceRoot {
  path: string;
  name?: string;
}

function normalizeRootPath(path: string): string {
  return trimTrailingSeparator(normalizePath(path));
}

function isWithinRoot(rootPath: string, activeFilePath: string): boolean {
  return (
    activeFilePath === rootPath || activeFilePath.startsWith(`${rootPath}/`)
  );
}

function findContainingWorkspaceRoot(
  roots: BreadcrumbWorkspaceRoot[],
  activeFilePath: string,
): BreadcrumbWorkspaceRoot | null {
  const normalizedActiveFile = normalizePath(activeFilePath);

  return (
    [...roots]
      .map((root) => ({
        ...root,
        path: normalizeRootPath(root.path),
      }))
      .sort((a, b) => b.path.length - a.path.length)
      .find((root) => isWithinRoot(root.path, normalizedActiveFile)) ?? null
  );
}

function buildWorkspaceRelativeBreadcrumb(
  root: BreadcrumbWorkspaceRoot,
  activeFilePath: string,
): BreadcrumbItem[] {
  const normalizedRootPath = normalizeRootPath(root.path);
  const normalizedActiveFile = normalizePath(activeFilePath);
  const relative = normalizedActiveFile.slice(normalizedRootPath.length + 1);
  const parts = splitPath(relative);
  const workspaceName = root.name?.trim() || getBasename(normalizedRootPath);

  if (!workspaceName || parts.length === 0) {
    return [];
  }

  const items: BreadcrumbItem[] = [
    {
      id: 'workspace',
      name: workspaceName,
      type: 'workspace',
      path: normalizedRootPath,
    },
  ];

  let currentPath = normalizedRootPath;
  parts.forEach((part, index) => {
    currentPath = joinPath(currentPath, part);
    const isLast = index === parts.length - 1;
    items.push({
      id: `${index}-${part}`,
      name: part,
      type: isLast ? 'file' : 'folder',
      path: currentPath,
    });
  });

  return items;
}

function buildAbsoluteFileBreadcrumb(activeFilePath: string): BreadcrumbItem[] {
  const normalizedActiveFile = normalizePath(activeFilePath);
  const parts = splitPath(normalizedActiveFile);

  if (parts.length === 0) {
    return [];
  }

  const items: BreadcrumbItem[] = [];
  let currentPath = normalizedActiveFile.startsWith('/') ? '/' : '';

  parts.forEach((part, index) => {
    currentPath = currentPath === '/' ? `/${part}` : joinPath(currentPath, part);
    const isLast = index === parts.length - 1;
    items.push({
      id: `${index}-${part}`,
      name: part,
      type: isLast ? 'file' : 'folder',
      path: currentPath,
    });
  });

  return items;
}

export function buildActiveFileBreadcrumb(
  roots: BreadcrumbWorkspaceRoot[],
  activeFile: string | null,
): BreadcrumbItem[] {
  if (!activeFile) {
    return [];
  }

  const containingRoot = findContainingWorkspaceRoot(roots, activeFile);
  if (containingRoot) {
    return buildWorkspaceRelativeBreadcrumb(containingRoot, activeFile);
  }

  return buildAbsoluteFileBreadcrumb(activeFile);
}

export function buildBreadcrumb(
  workspacePath: string | null,
  activeFile: string | null,
): BreadcrumbItem[] {
  if (!workspacePath || !activeFile) {
    return [];
  }

  return buildWorkspaceRelativeBreadcrumb({ path: workspacePath }, activeFile);
}

export function truncateBreadcrumb(
  items: BreadcrumbItem[],
  maxVisible = 4,
): BreadcrumbSegment[] {
  if (items.length <= maxVisible) {
    return items.map((item) => ({ type: 'item', item }));
  }

  const head = items[0];
  const tail = items.slice(-2);
  return [
    { type: 'item', item: head },
    { type: 'ellipsis' },
    ...tail.map((item) => ({ type: 'item' as const, item })),
  ];
}
