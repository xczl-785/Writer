import { describe, expect, it } from 'vitest';
import { getFileTreeMenuItems } from './fileTreeMenu';
import { isMenuItem } from './contextMenuRegistry';
import type { FileNode } from '../../../state/types';

const noop = () => {};

const fileNode: FileNode = {
  path: '/workspace/docs/note.md',
  name: 'note.md',
  type: 'file',
};

describe('fileTreeMenu', () => {
  it('includes required core menu items', () => {
    const items = getFileTreeMenuItems({
      node: fileNode,
      onNewFile: noop,
      onNewFolder: noop,
      onRename: noop,
      onRevealInFinder: noop,
      onCopyPath: noop,
      onDelete: noop,
    });
    const ids = items.filter(isMenuItem).map((item) => item.id);

    expect(ids).toContain('new-file');
    expect(ids).toContain('new-folder');
    expect(ids).toContain('rename');
    expect(ids).toContain('reveal-in-finder');
    expect(ids).toContain('copy-path');
    expect(ids).toContain('delete');
  });

  it('disables destructive operations for reserved paths', () => {
    const items = getFileTreeMenuItems({
      node: fileNode,
      onNewFile: noop,
      onNewFolder: noop,
      onRename: noop,
      onRevealInFinder: noop,
      onCopyPath: noop,
      onDelete: noop,
      isReservedPath: true,
    });
    const actionableItems = items.filter(isMenuItem);
    const renameItem = actionableItems.find((item) => item.id === 'rename');
    const deleteItem = actionableItems.find((item) => item.id === 'delete');

    expect(renameItem?.disabled?.()).toBe(true);
    expect(deleteItem?.disabled?.()).toBe(true);
  });
});
