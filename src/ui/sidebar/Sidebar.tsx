import { useState } from 'react';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { openWorkspace, openFile } from '../../workspace/WorkspaceManager';
import { FsService } from '../../services/fs/FsService';
import type { FileNode } from '../../state/types';
import {
  Folder,
  FolderOpen,
  FileText,
  FilePlus,
  FolderPlus,
} from 'lucide-react';

export function Sidebar() {
  const { nodes } = useFileTreeStore();

  const handleCreateFile = async () => {
    const { currentPath, activeFile } = useWorkspaceStore.getState();
    if (!currentPath) {
      alert('Please open a workspace first.');
      return;
    }

    let basePath = currentPath;
    if (activeFile) {
      const lastSlashIndex = activeFile.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        basePath = activeFile.substring(0, lastSlashIndex);
      }
    }

    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    const fullPath = `${basePath}/${fileName}`.replace(/\/+/g, '/');

    try {
      await FsService.createFile(fullPath);
      const nodes = await FsService.listTree(currentPath);
      useFileTreeStore.getState().setNodes(nodes);
      await openFile(fullPath);
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file. It might already exist.');
    }
  };

  const handleCreateFolder = async () => {
    const { currentPath, activeFile } = useWorkspaceStore.getState();
    if (!currentPath) {
      alert('Please open a workspace first.');
      return;
    }

    let basePath = currentPath;
    if (activeFile) {
      const lastSlashIndex = activeFile.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        basePath = activeFile.substring(0, lastSlashIndex);
      }
    }

    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const fullPath = `${basePath}/${folderName}`.replace(/\/+/g, '/');

    try {
      await FsService.createDir(fullPath);
      const nodes = await FsService.listTree(currentPath);
      useFileTreeStore.getState().setNodes(nodes);
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder. It might already exist.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50 border-r border-gray-200 w-64 flex-shrink-0 select-none">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateFile}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="New File"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={handleCreateFolder}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="New Folder"
          >
            <FolderPlus size={16} />
          </button>
          <button
            onClick={openWorkspace}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="Open Folder"
          >
            <FolderOpen size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
            <Folder size={24} className="mb-2 opacity-20" />
            <span>No folder opened</span>
            <button
              onClick={openWorkspace}
              className="mt-2 text-blue-500 hover:text-blue-600 text-xs font-medium"
            >
              Open Folder
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {nodes.map((node) => (
              <FileTreeNode key={node.path} node={node} level={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FileTreeNode({ node, level }: { node: FileNode; level: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDirectory = node.type === 'directory';
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      openFile(node.path);
    }
  };

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 py-1 px-2 hover:bg-gray-200/60 rounded-md cursor-pointer text-sm text-gray-700 transition-colors duration-150 ease-in-out"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0">
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen size={16} className="text-blue-500" />
            ) : (
              <Folder size={16} className="text-blue-500" />
            )
          ) : (
            <FileText size={16} className="text-gray-500" />
          )}
        </span>

        <span className="truncate flex-1 leading-none py-0.5">{node.name}</span>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center"></div>
      </div>

      {isDirectory && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
