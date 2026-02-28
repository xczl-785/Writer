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

  const workspaceName = workspacePath.split('/').filter(Boolean).pop();
  if (!workspaceName) {
    return [];
  }

  const workspacePrefix = workspacePath.endsWith('/')
    ? workspacePath
    : `${workspacePath}/`;
  const relative = activeFile.startsWith(workspacePrefix)
    ? activeFile.slice(workspacePrefix.length)
    : activeFile;
  const parts = relative.split('/').filter(Boolean);
  if (parts.length === 0) {
    return [];
  }

  const items: BreadcrumbItem[] = [
    {
      id: 'workspace',
      name: workspaceName,
      type: 'workspace',
      path: workspacePath,
    },
  ];

  let currentPath = workspacePath;
  parts.forEach((part, index) => {
    currentPath = `${currentPath}/${part}`.replace(/\/+/g, '/');
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
