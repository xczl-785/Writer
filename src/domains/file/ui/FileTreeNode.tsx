// src/ui/sidebar/FileTreeNode.tsx
// V6 文件树节点组件 - 像素级精确实现

import React from 'react';
import type { FileNode } from '../../../state/types';
import { useFileTreeStore } from '../state/fileStore';
import { useWorkspaceStore } from '../../../state/slices/workspaceSlice';
import { workspaceActions } from '../../../state/actions/workspaceActions';
import { FileIcon } from 'lucide-react';
import { DeletedFileMarker } from '../../../ui/components/ErrorStates';

// 纯线框风格的文件夹图标组件（用于根文件夹和子文件夹）
const FolderOutlineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  rootPath: string;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  depth,
  rootPath,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const expandedPaths = useFileTreeStore((state) => state.expandedPaths);
  const deletedPaths = useFileTreeStore((state) => state.deletedPaths);

  const isFolder = node.type === 'directory';
  const isActive = node.path === activeFile;
  const isDeleted = deletedPaths.has(node.path);
  const isActuallyExpanded = expandedPaths.has(node.path);

  const handleClick = async () => {
    if (isFolder) {
      setIsExpanded(!isExpanded);
    } else {
      await workspaceActions.openFile(node.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  };

  // TODO: 未来可实现选中文件夹的视觉状态（需添加 selectedFolder 状态）
  const isSelectedFolder = false; // 暂时硬编码为 false

  if (isDeleted) {
    return (
      <DeletedFileMarker
        filePath={node.path}
        fileName={node.name}
        isDirectory={isFolder}
        depth={depth}
      />
    );
  }

  // 根据节点类型和状态构建样式
  const getNodeStyles = () => {
    const baseStyles = 'flex items-center px-3 py-1.5 cursor-pointer select-none group';

    // 活跃文件：蓝色背景 + 左侧指示条
    if (isActive && !isFolder) {
      return `${baseStyles} ml-6 mt-0.5 relative bg-blue-50/50`;
    }

    // 选中文件夹：灰色背景
    if (isFolder && isSelectedFolder) {
      return `${baseStyles} mt-2 text-zinc-800 bg-zinc-200/50 hover:bg-zinc-200/80 transition-colors`;
    }

    // 静置文件夹
    if (isFolder && !isSelectedFolder) {
      return `${baseStyles} mt-2 text-zinc-500 hover:text-zinc-800 transition-colors`;
    }

    // 普通未选中文件
    return `${baseStyles} hover:bg-zinc-100/50 mt-1`;
  };

  // 文件图标样式
  const getIconStyles = () => {
    if (isActive && !isFolder) {
      return 'w-4 h-4 text-blue-500 mr-2 shrink-0';
    }
    if (isFolder) {
      return isSelectedFolder
        ? 'w-4 h-4 mr-2 text-zinc-800 shrink-0'
        : 'w-4 h-4 mr-2 text-zinc-400 group-hover:text-zinc-500 shrink-0';
    }
    return 'w-4 h-4 text-zinc-400 mr-2 shrink-0';
  };

  // 文字样式
  const getTextStyles = () => {
    if (isActive && !isFolder) {
      return 'text-sm font-medium text-zinc-900 truncate';
    }
    if (isFolder && isSelectedFolder) {
      return 'text-sm font-medium';
    }
    if (isFolder && !isSelectedFolder) {
      return 'text-sm';
    }
    return 'text-sm text-zinc-500 group-hover:text-zinc-900 truncate';
  };

  return (
    <>
      <div
        className={getNodeStyles()}
        role="treeitem"
        tabIndex={0}
        aria-selected={isActive}
        data-expanded={isFolder ? isActuallyExpanded : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* 活跃文件左侧指示条 */}
        {isActive && !isFolder && (
          <div className="absolute left-[-24px] top-1 bottom-1 w-[3px] bg-blue-500 rounded-r-full" />
        )}

        {/* 文件夹展开/折叠箭头 */}
        {isFolder && (
          <svg
            className="w-4 h-4 mr-2 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            {isActuallyExpanded ? (
              <path
                d="M6 9l6 6 6-6"
                className={isSelectedFolder ? 'text-zinc-600' : 'text-zinc-300'}
              />
            ) : (
              <path
                d="M9 18l6-6-6-6"
                className={isSelectedFolder ? 'text-zinc-600' : 'text-zinc-300'}
              />
            )}
          </svg>
        )}

        {/* 文件/文件夹图标 */}
        {isFolder ? (
          <FolderOutlineIcon className={getIconStyles()} />
        ) : (
          <FileIcon size={16} className={getIconStyles()} />
        )}

        {/* 文件名 */}
        <span className={getTextStyles()}>{node.name}</span>
      </div>

      {/* 子节点渲染 */}
      {isFolder &&
        isActuallyExpanded &&
        node.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            rootPath={rootPath}
          />
        ))}
    </>
  );
};