/**
 * flattenTree 测试
 */

import { describe, it, expect } from 'vitest';
import {
  flattenTreeWithState,
  flattenMultipleRoots,
  getItemSize,
  DEFAULT_ROW_HEIGHT,
  GHOST_NODE_HEIGHT,
} from './flattenTree';
import type { FileNode } from '../../../state/types';
import type { FlattenedNode } from './types';

describe('flattenTreeWithState', () => {
  const createMockNode = (
    name: string,
    path: string,
    type: 'file' | 'directory',
    children?: FileNode[],
  ): FileNode => ({
    name,
    path,
    type,
    children,
  });

  it('should flatten a simple file tree', () => {
    const nodes: FileNode[] = [
      createMockNode('file1.md', '/root/file1.md', 'file'),
      createMockNode('folder1', '/root/folder1', 'directory', [
        createMockNode('file2.md', '/root/folder1/file2.md', 'file'),
      ]),
    ];

    const expandedPaths = new Set<string>();
    const result = flattenTreeWithState(nodes, {
      expandedPaths,
      rootPath: '/root',
    });

    expect(result).toHaveLength(2); // 折叠状态下只显示根级别的节点
    expect(result[0].node.name).toBe('file1.md');
    expect(result[0].depth).toBe(0);
    expect(result[1].node.name).toBe('folder1');
    expect(result[1].depth).toBe(0);
    expect(result[1].isExpanded).toBe(false);
  });

  it('should show children when folder is expanded', () => {
    const nodes: FileNode[] = [
      createMockNode('folder1', '/root/folder1', 'directory', [
        createMockNode('file2.md', '/root/folder1/file2.md', 'file'),
        createMockNode('subfolder', '/root/folder1/subfolder', 'directory', [
          createMockNode(
            'file3.md',
            '/root/folder1/subfolder/file3.md',
            'file',
          ),
        ]),
      ]),
    ];

    const expandedPaths = new Set<string>(['/root/folder1']);
    const result = flattenTreeWithState(nodes, {
      expandedPaths,
      rootPath: '/root',
    });

    // folder1 展开后显示：folder1 + file2 + subfolder（subfolder 未展开，所以 file3 不显示）
    expect(result).toHaveLength(3);
    expect(result[0].node.name).toBe('folder1');
    expect(result[0].isExpanded).toBe(true);
    expect(result[1].node.name).toBe('file2.md');
    expect(result[1].depth).toBe(1);
    expect(result[2].node.name).toBe('subfolder');
    expect(result[2].depth).toBe(1);
    expect(result[2].isExpanded).toBe(false);
  });

  it('should handle nested expanded folders', () => {
    const nodes: FileNode[] = [
      createMockNode('folder1', '/root/folder1', 'directory', [
        createMockNode('subfolder', '/root/folder1/subfolder', 'directory', [
          createMockNode(
            'file1.md',
            '/root/folder1/subfolder/file1.md',
            'file',
          ),
        ]),
      ]),
    ];

    const expandedPaths = new Set<string>([
      '/root/folder1',
      '/root/folder1/subfolder',
    ]);
    const result = flattenTreeWithState(nodes, {
      expandedPaths,
      rootPath: '/root',
    });

    expect(result).toHaveLength(3);
    expect(result[0].depth).toBe(0);
    expect(result[1].depth).toBe(1);
    expect(result[2].depth).toBe(2);
  });

  it('should handle empty tree', () => {
    const nodes: FileNode[] = [];
    const expandedPaths = new Set<string>();
    const result = flattenTreeWithState(nodes, {
      expandedPaths,
      rootPath: '/root',
    });

    expect(result).toHaveLength(0);
  });
});

describe('flattenMultipleRoots', () => {
  const createMockNode = (
    name: string,
    path: string,
    type: 'file' | 'directory',
    children?: FileNode[],
  ): FileNode => ({
    name,
    path,
    type,
    children,
  });

  it('should flatten multiple root folders', () => {
    const rootFolders = [
      {
        workspacePath: '/root1',
        displayName: 'Root 1',
        tree: [createMockNode('file1.md', '/root1/file1.md', 'file')],
      },
      {
        workspacePath: '/root2',
        displayName: 'Root 2',
        tree: [createMockNode('file2.md', '/root2/file2.md', 'file')],
      },
    ];

    const expandedPaths = new Set<string>();
    const result = flattenMultipleRoots(rootFolders, expandedPaths);

    expect(result).toHaveLength(2);
    expect(result[0].rootPath).toBe('/root1');
    expect(result[1].rootPath).toBe('/root2');
  });
});

describe('getItemSize', () => {
  it('should return default row height for normal nodes', () => {
    const flattenedNodes: FlattenedNode[] = [
      {
        id: '/root/file1.md',
        node: { name: 'file1.md', path: '/root/file1.md', type: 'file' },
        depth: 0,
        rootPath: '/root',
        isExpanded: false,
        hasChildren: false,
      },
    ];

    const itemSize = getItemSize(flattenedNodes, null);
    expect(itemSize(0)).toBe(DEFAULT_ROW_HEIGHT);
  });

  it('should return increased height for nodes with ghost children', () => {
    const flattenedNodes: FlattenedNode[] = [
      {
        id: '/root/folder1',
        node: { name: 'folder1', path: '/root/folder1', type: 'directory' },
        depth: 0,
        rootPath: '/root',
        isExpanded: true,
        hasChildren: true,
      },
    ];

    const ghostNode = {
      parentPath: '/root/folder1',
      type: 'file' as const,
      rootPath: '/root',
    };

    const itemSize = getItemSize(flattenedNodes, ghostNode);
    expect(itemSize(0)).toBe(DEFAULT_ROW_HEIGHT + GHOST_NODE_HEIGHT);
  });
});
