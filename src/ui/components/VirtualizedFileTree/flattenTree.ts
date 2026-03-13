/**
 * 树形结构扁平化工具函数
 * 将树形 FileNode 数组转换为扁平数组，同时保留层级信息
 */

import type { FileNode } from '../../../state/types';
import type { FlattenedNode, TreeFlattenerOptions } from './types';

/**
 * 递归扁平化树节点
 */
function flattenNode(
  node: FileNode,
  depth: number,
  rootPath: string,
  expandedPaths: Set<string>,
  result: FlattenedNode[],
): void {
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren =
    node.type === 'directory' && node.children && node.children.length > 0;

  result.push({
    id: node.path,
    node,
    depth,
    rootPath,
    isExpanded,
    hasChildren: Boolean(hasChildren),
  });

  // 如果是目录且已展开，递归处理子节点
  if (node.type === 'directory' && isExpanded && node.children) {
    for (const child of node.children) {
      flattenNode(child, depth + 1, rootPath, expandedPaths, result);
    }
  }
}

/**
 * 将树形结构扁平化为虚拟列表可用的数组
 * @param nodes 文件节点数组
 * @param options 配置选项
 * @returns 扁平化后的节点数组
 */
export function flattenTreeWithState(
  nodes: FileNode[],
  options: TreeFlattenerOptions,
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  const { expandedPaths, rootPath } = options;

  for (const node of nodes) {
    flattenNode(node, 0, rootPath, expandedPaths, result);
  }

  return result;
}

/**
 * 扁平化多个根文件夹
 * @param rootFolders 根文件夹数组
 * @param expandedPaths 展开路径集合
 * @returns 扁平化后的节点数组
 */
export function flattenMultipleRoots(
  rootFolders: Array<{
    workspacePath: string;
    displayName: string;
    tree: FileNode[];
  }>,
  expandedPaths: Set<string>,
): FlattenedNode[] {
  const result: FlattenedNode[] = [];

  for (const rootFolder of rootFolders) {
    // 为每个根添加一个标题节点（可选）
    // 这里我们直接扁平化树内容
    for (const node of rootFolder.tree) {
      flattenNode(node, 0, rootFolder.workspacePath, expandedPaths, result);
    }
  }

  return result;
}

/**
 * 查找节点在扁平数组中的索引
 */
export function findNodeIndex(
  flattened: FlattenedNode[],
  path: string,
): number {
  return flattened.findIndex((item) => item.id === path);
}

/**
 * 计算虚拟列表的行高
 * 基础高度：28px（单行文本）
 * 如果有子节点创建中的 ghost 节点，需要额外高度
 */
export const DEFAULT_ROW_HEIGHT = 28;
export const GHOST_NODE_HEIGHT = 32;

export function getItemSize(
  flattenedNodes: FlattenedNode[],
  ghostNode: {
    parentPath: string | null;
    type: 'file' | 'directory';
    rootPath: string;
  } | null,
): (index: number) => number {
  return (index: number): number => {
    const item = flattenedNodes[index];
    if (!item) return DEFAULT_ROW_HEIGHT;

    // 如果是目录且已展开，且有 ghost 节点要在此处显示
    if (
      ghostNode &&
      ghostNode.parentPath === item.node.path &&
      item.isExpanded
    ) {
      return DEFAULT_ROW_HEIGHT + GHOST_NODE_HEIGHT;
    }

    return DEFAULT_ROW_HEIGHT;
  };
}
