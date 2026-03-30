import { describe, expect, it } from 'vitest';
import {
  resolveDropTarget,
  type DragDescriptor,
  type TreeDropCandidate,
} from './dragDropTargets';

const dragFile: DragDescriptor = {
  dragPath: '/ws/src.md',
  dragType: 'file',
  dragRootPath: '/ws',
  isDragging: true,
};

describe('dragDropTargets', () => {
  it('accepts directory nodes as inside drop targets', () => {
    const candidate: TreeDropCandidate = {
      treePath: '/ws/archive',
      treeType: 'directory',
      treeRoot: '/ws',
    };

    expect(resolveDropTarget(candidate, dragFile)).toEqual({
      dropTargetPath: '/ws/archive',
      dropPosition: 'inside',
      reason: 'directory',
    });
  });

  it('maps file nodes to their parent directory so dropping on a file moves beside it', () => {
    const candidate: TreeDropCandidate = {
      treePath: '/ws/other.md',
      treeType: 'file',
      treeRoot: '/ws',
    };

    expect(resolveDropTarget(candidate, dragFile)).toEqual({
      dropTargetPath: '/ws',
      dropPosition: 'inside',
      reason: 'file-parent-directory',
    });
  });

  it('maps root-level file targets back to the workspace root', () => {
    const candidate: TreeDropCandidate = {
      treePath: '/ws/root-file.md',
      treeType: 'file',
      treeRoot: '/ws',
    };

    expect(resolveDropTarget(candidate, dragFile)).toEqual({
      dropTargetPath: '/ws',
      dropPosition: 'inside',
      reason: 'file-parent-directory',
    });
  });

  it('rejects self and descendant targets', () => {
    const selfCandidate: TreeDropCandidate = {
      treePath: '/ws/src.md',
      treeType: 'file',
      treeRoot: '/ws',
    };
    const descendantDrag: DragDescriptor = {
      dragPath: '/ws/docs',
      dragType: 'directory',
      dragRootPath: '/ws',
      isDragging: true,
    };
    const descendantCandidate: TreeDropCandidate = {
      treePath: '/ws/docs/nested',
      treeType: 'directory',
      treeRoot: '/ws',
    };

    expect(resolveDropTarget(selfCandidate, dragFile)).toEqual({
      dropTargetPath: null,
      dropPosition: null,
      reason: 'self-or-descendant',
    });
    expect(resolveDropTarget(descendantCandidate, descendantDrag)).toEqual({
      dropTargetPath: null,
      dropPosition: null,
      reason: 'self-or-descendant',
    });
  });
});
