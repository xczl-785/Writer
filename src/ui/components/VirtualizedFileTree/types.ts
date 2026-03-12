/**
 * VirtualizedFileTree - 虚拟滚动文件树组件
 * 使用 react-window VariableSizeList 实现高性能渲染
 */

export interface FlattenedNode {
  id: string;
  node: import('../../../state/types').FileNode;
  depth: number;
  rootPath: string;
  isExpanded: boolean;
  hasChildren: boolean;
}

export interface VirtualizedTreeProps {
  flattenedNodes: FlattenedNode[];
  selectedPath: string | null;
  activeFile: string | null;
  renamingPath: string | null;
  renameTrigger: number;
  ghostNode: {
    parentPath: string | null;
    type: 'file' | 'directory';
    rootPath: string;
  } | null;
  containerHeight: number;
  onToggleExpand: (path: string) => void;
  onSelect: (path: string) => void;
  onOpenContextMenu: (event: React.MouseEvent, node: import('../../../state/types').FileNode, rootPath: string) => void;
  onGhostCommit: (name: string, trigger: 'enter' | 'blur') => Promise<void>;
  onGhostCancel: () => void;
  onRequestRenameStart: (path: string) => void;
  onRequestRenameEnd: () => void;
}

export interface TreeFlattenerOptions {
  expandedPaths: Set<string>;
  rootPath: string;
}

export type ItemSizeGetter = (index: number) => number;