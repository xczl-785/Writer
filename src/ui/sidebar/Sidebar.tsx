import { useState } from 'react';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import { openWorkspace, openFile } from '../../workspace/WorkspaceManager';
import type { FileNode } from '../../state/types';

export function Sidebar() {
  const { nodes } = useFileTreeStore();

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200 w-64 flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={openWorkspace}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Open Folder
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {nodes.length === 0 ? (
          <div className="text-gray-400 text-sm text-center mt-4">
            No folder opened
          </div>
        ) : (
          nodes.map((node) => <FileTreeNode key={node.path} node={node} />)
        )}
      </div>
    </div>
  );
}

function FileTreeNode({ node }: { node: FileNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDirectory = node.type === 'directory';

  const handleClick = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      openFile(node.path);
    }
  };

  return (
    <div className="select-none">
      <div
        className="py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm truncate"
        onClick={handleClick}
      >
        {isDirectory ? (isExpanded ? '📂 ' : '📁 ') : '📄 '}
        {node.name}
      </div>
      {isDirectory && isExpanded && node.children && (
        <div className="pl-4 border-l border-gray-200 ml-2">
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
