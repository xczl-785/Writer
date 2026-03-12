// src/ui/sidebar/FileTreeNode.tsx
// V6 文件树节点组件（支持多根）

import React from 'react';
import type { FileNode } from '../../state/types';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { workspaceActions } from '../../state/actions/workspaceActions';
import { Folder, FileIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { t } from '../../i18n';

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  rootPath: string;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, depth, rootPath }) => {
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: 集成右键菜单
    console.log('Context menu for:', node.path);
  };

  const style: React.CSSProperties = {
    paddingLeft: `${depth * 16}px`,
  };

  if (isDeleted) {
    return (
      <div
        className="file-tree-node deleted"
        style={style}
        title={t('fileTree.deleted')}
      >
        <span className="node-icon">⚠️</span>
        <span className="node-name">{node.name} ({t('status.deleted')})</span>
      </div>
    );
  }

  return (
    <>
      <div
        className={`file-tree-node ${isActive ? 'active' : ''} ${isFolder ? 'folder' : 'file'}`}
        style={style}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {isFolder && (
          <span className="expand-icon">
            {isActuallyExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        
        <span className="node-icon">
          {isFolder ? <Folder size={16} /> : <FileIcon size={16} />}
        </span>
        
        <button className="node-name" type="button" onClick={handleClick}>
          {node.name}
        </button>
      </div>
      
      {isFolder && isActuallyExpanded && node.children?.map((child) => (
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
