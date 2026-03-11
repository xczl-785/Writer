// src/ui/sidebar/MultiRootFileTree.tsx
// V6 多根文件树容器组件

import React from 'react';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import { WorkspaceRootHeader } from './WorkspaceRootHeader';
import { FileTreeNode } from './FileTreeNode';

export const MultiRootFileTree: React.FC = () => {
  const rootFolders = useFileTreeStore((state) => state.rootFolders);
  const loadingPaths = useFileTreeStore((state) => state.loadingPaths);
  const errorPaths = useFileTreeStore((state) => state.errorPaths);

  if (rootFolders.length === 0) {
    return null;
  }

  return (
    <div className="multi-root-file-tree">
      {rootFolders.map((rootFolder) => (
        <div key={rootFolder.workspacePath} className="root-folder-group">
          <WorkspaceRootHeader folder={rootFolder} />
          
          <div className="root-folder-content">
            {loadingPaths.has(rootFolder.workspacePath) ? (
              <div className="loading-indicator">加载中...</div>
            ) : errorPaths.has(rootFolder.workspacePath) ? (
              <div className="error-indicator">
                {errorPaths.get(rootFolder.workspacePath)}
              </div>
            ) : (
              rootFolder.tree.map((node) => (
                <FileTreeNode
                  key={node.path}
                  node={node}
                  depth={1}
                  rootPath={rootFolder.workspacePath}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
