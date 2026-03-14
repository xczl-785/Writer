import {
  normalizePath,
  splitPath,
  trimTrailingSeparator,
  joinPath,
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

export function buildBreadcrumb(
  workspacePath: string | null,
  activeFile: string | null,
): BreadcrumbItem[] {
  if (!workspacePath || !activeFile) {
    return [];
  }

  const normalizedWorkspacePath = normalizePath(workspacePath);
  const normalizedActiveFile = normalizePath(activeFile);

  const workspaceParts = splitPath(normalizedWorkspacePath);
  const workspaceName = workspaceParts[workspaceParts.length - 1];
  if (!workspaceName) {
    return [];
  }

  const workspacePrefix = normalizedWorkspacePath + '/';
  const relative = normalizedActiveFile.startsWith(workspacePrefix)
    ? normalizedActiveFile.slice(workspacePrefix.length)
    : normalizedActiveFile;
  const parts = splitPath(relative);
  if (parts.length === 0) {
    return [];
  }

  const items: BreadcrumbItem[] = [
    {
      id: 'workspace',
      name: workspaceName,
      type: 'workspace',
      path: normalizedWorkspacePath,
    },
  ];

  let currentPath = trimTrailingSeparator(normalizedWorkspacePath);
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
