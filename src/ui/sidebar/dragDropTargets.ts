import { getParentPath } from './pathing';

export type DropPosition = 'inside' | 'above' | 'below';

export type DragDescriptor = {
  isDragging: boolean;
  dragPath: string | null;
  dragType: 'file' | 'directory' | null;
  dragRootPath: string | null;
};

export type TreeDropCandidate = {
  treePath: string | null;
  treeType: 'file' | 'directory' | null;
  treeRoot: string | null;
};

export type ResolvedDropTarget = {
  dropTargetPath: string | null;
  dropPosition: DropPosition | null;
  reason:
    | 'directory'
    | 'file-parent-directory'
    | 'self-or-descendant'
    | 'missing-drag-path'
    | 'missing-candidate';
};

export function resolveDropTarget(
  candidate: TreeDropCandidate | null,
  drag: DragDescriptor,
): ResolvedDropTarget {
  if (!drag.dragPath) {
    return {
      dropTargetPath: null,
      dropPosition: null,
      reason: 'missing-drag-path',
    };
  }

  if (!candidate?.treePath || !candidate.treeType) {
    return {
      dropTargetPath: null,
      dropPosition: null,
      reason: 'missing-candidate',
    };
  }

  if (
    candidate.treePath === drag.dragPath ||
    candidate.treePath.startsWith(drag.dragPath + '/')
  ) {
    return {
      dropTargetPath: null,
      dropPosition: null,
      reason: 'self-or-descendant',
    };
  }

  if (candidate.treeType !== 'directory') {
    const parentPath = getParentPath(candidate.treePath) || candidate.treeRoot;

    if (!parentPath) {
      return {
        dropTargetPath: null,
        dropPosition: null,
        reason: 'missing-candidate',
      };
    }

    return {
      dropTargetPath: parentPath,
      dropPosition: 'inside',
      reason: 'file-parent-directory',
    };
  }

  return {
    dropTargetPath: candidate.treePath,
    dropPosition: 'inside',
    reason: 'directory',
  };
}
