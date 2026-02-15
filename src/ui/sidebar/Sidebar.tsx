import { useState } from 'react';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { useEditorStore } from '../../state/slices/editorSlice';
import { openWorkspace, openFile } from '../../workspace/WorkspaceManager';
import { FsService } from '../../services/fs/FsService';
import { FsSafety } from '../../services/fs/FsSafety';
import type { FileNode } from '../../state/types';
import {
  ensureMarkdownExtension,
  filterVisibleNodes,
  getDisplayName,
  getFileExtension,
  getParentPath,
  hasInvalidNodeName,
  resolveCreateBasePath,
} from './pathing';
import {
  Folder,
  FolderOpen,
  FileText,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
} from 'lucide-react';

export function Sidebar() {
  const { nodes } = useFileTreeStore();
  const { currentPath } = useWorkspaceStore();
  const visibleNodes = filterVisibleNodes(nodes);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<FileNode['type'] | null>(
    null,
  );
  const [createMode, setCreateMode] = useState<'file' | 'folder' | null>(null);
  const [draftName, setDraftName] = useState('');
  const [pendingDeleteNode, setPendingDeleteNode] = useState<FileNode | null>(
    null,
  );

  const startCreate = (mode: 'file' | 'folder') => {
    setCreateMode(mode);
    setDraftName(mode === 'file' ? 'untitled' : 'new-folder');
  };

  const cancelCreate = () => {
    setCreateMode(null);
    setDraftName('');
  };

  const submitCreate = async () => {
    const { currentPath, activeFile } = useWorkspaceStore.getState();
    if (!currentPath || !createMode) {
      cancelCreate();
      return;
    }

    if (hasInvalidNodeName(draftName)) {
      alert(
        createMode === 'file'
          ? 'File name is invalid.'
          : 'Folder name is invalid.',
      );
      return;
    }

    const basePath = resolveCreateBasePath({
      currentPath,
      selectedPath,
      selectedType,
      activeFile,
    });

    const nodeName =
      createMode === 'file'
        ? ensureMarkdownExtension(draftName)
        : draftName.trim();
    const fullPath = `${basePath}/${nodeName}`.replace(/\/+/g, '/');

    try {
      if (createMode === 'file') {
        await FsService.createFile(fullPath);
      } else {
        await FsService.createDir(fullPath);
      }

      const refreshedNodes = await FsService.listTree(currentPath);
      useFileTreeStore.getState().setNodes(refreshedNodes);

      setSelectedPath(fullPath);
      setSelectedType(createMode === 'file' ? 'file' : 'directory');

      if (createMode === 'file') {
        await openFile(fullPath);
      }

      cancelCreate();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(
        createMode === 'file'
          ? `Failed to create file: ${message}`
          : `Failed to create folder: ${message}`,
      );
    }
  };

  const handleCreateFile = async () => {
    const { currentPath } = useWorkspaceStore.getState();
    if (!currentPath) {
      alert('Please open a workspace first.');
      return;
    }
    startCreate('file');
  };

  const handleCreateFolder = async () => {
    const { currentPath } = useWorkspaceStore.getState();
    if (!currentPath) {
      alert('Please open a workspace first.');
      return;
    }
    startCreate('folder');
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
        {createMode && (
          <div className="mb-2 rounded-md border border-gray-300 bg-white p-2 space-y-2">
            <div className="text-xs text-gray-600">
              {createMode === 'file' ? 'Create new file' : 'Create new folder'}
            </div>
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitCreate();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelCreate();
                }
              }}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => void submitCreate()}
                className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
              >
                Create
              </button>
              <button
                onClick={cancelCreate}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {visibleNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
            <Folder size={24} className="mb-2 opacity-20" />
            <span>{currentPath ? 'No markdown files' : 'No folder opened'}</span>
            {!currentPath && (
              <button
                onClick={openWorkspace}
                className="mt-2 text-blue-500 hover:text-blue-600 text-xs font-medium"
              >
                Open Folder
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {visibleNodes.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                level={0}
                selectedPath={selectedPath}
                onRequestDelete={(target) => setPendingDeleteNode(target)}
                onSelect={(path, type) => {
                  setSelectedPath(path);
                  setSelectedType(type);
                }}
              />
            ))}
          </div>
        )}
      </div>
      {pendingDeleteNode && (
        <DeleteConfirmDialog
          node={pendingDeleteNode}
          onCancel={() => setPendingDeleteNode(null)}
          onConfirm={() => setPendingDeleteNode(null)}
        />
      )}
    </div>
  );
}

function FileTreeNode({
  node,
  level,
  selectedPath,
  onRequestDelete,
  onSelect,
}: {
  node: FileNode;
  level: number;
  selectedPath: string | null;
  onRequestDelete: (node: FileNode) => void;
  onSelect: (path: string, type: FileNode['type']) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(getDisplayName(node));
  const isDirectory = node.type === 'directory';
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path, node.type);

    if (isRenaming) {
      return;
    }

    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      void openFile(node.path);
    }
  };

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameDraft(getDisplayName(node));
    setIsRenaming(true);
  };

  const cancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenameDraft(getDisplayName(node));
    setIsRenaming(false);
  };

  const submitRename = async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    const newName = renameDraft.trim();
    if (newName === getDisplayName(node)) {
      setIsRenaming(false);
      return;
    }

    if (hasInvalidNodeName(newName)) {
      alert('Name is invalid.');
      return;
    }

    const success = await FsSafety.flushAffectedFiles(node.path);
    if (!success) {
      alert('Failed to save changes before rename. Operation aborted.');
      return;
    }

    const parentPath = getParentPath(node.path);
    const newFileName =
      node.type === 'file'
        ? `${newName}${getFileExtension(node.name) || '.md'}`
        : newName;
    const newPath = parentPath ? `${parentPath}/${newFileName}` : newFileName;

    try {
      await FsService.renameNode(node.path, newPath);

      useWorkspaceStore.getState().renameFile(node.path, newPath);
      useEditorStore.getState().renameFile(node.path, newPath);

      const { currentPath } = useWorkspaceStore.getState();
      if (currentPath) {
        const nodes = await FsService.listTree(currentPath);
        useFileTreeStore.getState().setNodes(nodes);
      }

      onSelect(newPath, node.type);
      setIsRenaming(false);
    } catch (error) {
      console.error('Failed to rename:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to rename file/folder: ${message}`);
    }
  };

  const requestDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestDelete(node);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer text-sm text-gray-700 transition-colors duration-150 ease-in-out ${
          isSelected ? 'bg-blue-100/80' : 'hover:bg-gray-200/60'
        }`}
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

        {isRenaming ? (
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submitRename();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelRename();
              }
            }}
            className="flex-1 rounded border border-gray-300 px-1 py-0.5 text-sm"
          />
        ) : (
          <span className="truncate flex-1 leading-none py-0.5">
            {getDisplayName(node)}
          </span>
        )}

        {isRenaming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => void submitRename()}
              className="rounded border border-gray-300 px-1 text-[10px] text-gray-700 hover:bg-gray-100"
              title="Save"
            >
              Save
            </button>
            <button
              onClick={cancelRename}
              className="rounded border border-gray-300 px-1 text-[10px] text-gray-700 hover:bg-gray-100"
              title="Cancel"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={startRename}
              className="p-0.5 hover:bg-gray-300 rounded text-gray-500 hover:text-gray-700"
              title="Rename"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={requestDelete}
              className="p-0.5 hover:bg-gray-300 rounded text-red-400 hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {isDirectory && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedPath={selectedPath}
              onRequestDelete={onRequestDelete}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteConfirmDialog({
  node,
  onCancel,
  onConfirm,
}: {
  node: FileNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    const success = await FsSafety.flushAffectedFiles(node.path);
    if (!success) {
      setIsDeleting(false);
      alert('Failed to save changes before delete. Operation aborted.');
      return;
    }

    try {
      await FsService.deleteNode(node.path);

      useWorkspaceStore.getState().removePath(node.path);
      useEditorStore.getState().removePath(node.path);

      const { currentPath } = useWorkspaceStore.getState();
      if (currentPath) {
        const nodes = await FsService.listTree(currentPath);
        useFileTreeStore.getState().setNodes(nodes);
      }
      onConfirm();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to delete file/folder: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
        <h3 className="text-sm font-semibold text-gray-900">Delete confirmation</h3>
        <p className="mt-2 text-sm text-gray-600">
          Delete <span className="font-medium text-gray-900">{getDisplayName(node)}</span>
          {node.type === 'directory' ? ' and all its contents?' : '?'}
        </p>
        <label className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" disabled />
          Do not ask again (coming soon)
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={isDeleting}
            className="rounded bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
