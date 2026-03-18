import type { FileNode } from '../../../state/types';
import { getParentPath, normalizePath } from '../../../shared/utils/pathUtils';

type NodeType = FileNode['type'] | null;

export interface ResolveCreateBasePathInput {
  currentPath: string;
  selectedPath: string | null;
  selectedType: NodeType;
  activeFile: string | null;
}

export interface ResolveCreateGhostTargetInput {
  type: 'file' | 'directory';
  rootPath: string;
  targetPath: string | null;
  targetType: NodeType;
  activeFile: string | null;
}

export interface CreateGhostTarget {
  parentPath: string | null;
  type: 'file' | 'directory';
  rootPath: string;
}

export function resolveCreateBasePath({
  currentPath,
  selectedPath,
  selectedType,
  activeFile,
}: ResolveCreateBasePathInput): string {
  if (selectedPath && selectedType === null && selectedPath === currentPath) {
    return currentPath;
  }

  if (selectedPath) {
    if (selectedType === 'directory') {
      return selectedPath;
    }
    if (selectedType === 'file') {
      return getParentPath(selectedPath) || currentPath;
    }
  }

  if (selectedPath === null) {
    if (activeFile) {
      return getParentPath(activeFile) || currentPath;
    }
    return currentPath;
  }

  return currentPath;
}

export function resolveCreateGhostTarget({
  type,
  rootPath,
  targetPath,
  targetType,
  activeFile,
}: ResolveCreateGhostTargetInput): CreateGhostTarget {
  const basePath = resolveCreateBasePath({
    currentPath: rootPath,
    selectedPath: targetPath,
    selectedType: targetType,
    activeFile,
  });
  const normalizedBasePath = normalizePath(basePath);
  const normalizedRootPath = normalizePath(rootPath);

  return {
    parentPath: normalizedBasePath === normalizedRootPath ? null : basePath,
    type,
    rootPath,
  };
}
