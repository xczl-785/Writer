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

const normalizeForCompare = (path: string): string => path.replace(/\\/g, '/');

const trimTrailingSeparators = (path: string): string =>
  path.replace(/[\\/]+$/g, '');

export function buildBreadcrumb(
  workspacePath: string | null,
  activeFile: string | null,
): BreadcrumbItem[] {
  if (!workspacePath || !activeFile) {
    return [];
  }

  const normalizedWorkspacePath = normalizeForCompare(workspacePath);
  const normalizedActiveFile = normalizeForCompare(activeFile);

  const workspaceName = normalizedWorkspacePath.split('/').filter(Boolean).pop();
  if (!workspaceName) {
    return [];
  }

  const workspacePrefix = normalizedWorkspacePath.endsWith('/')
    ? normalizedWorkspacePath
    : `${normalizedWorkspacePath}/`;
  const relative = normalizedActiveFile.startsWith(workspacePrefix)
    ? normalizedActiveFile.slice(workspacePrefix.length)
    : normalizedActiveFile;
  const parts = relative.split('/').filter(Boolean);
  if (parts.length === 0) {
    return [];
  }

  const separator =
    workspacePath.includes('\\') && !workspacePath.includes('/') ? '\\' : '/';

  const items: BreadcrumbItem[] = [
    {
      id: 'workspace',
      name: workspaceName,
      type: 'workspace',
      path: workspacePath,
    },
  ];

  let currentPath = trimTrailingSeparators(workspacePath);
  parts.forEach((part, index) => {
    currentPath = `${currentPath}${separator}${part}`;
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
