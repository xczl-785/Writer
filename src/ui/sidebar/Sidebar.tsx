import { useEffect, useMemo, useState } from 'react';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { useStatusStore } from '../../state/slices/statusSlice';
import { fileActions } from '../../state/actions/fileActions';
import { openWorkspace, openFile } from '../../workspace/WorkspaceManager';
import { FsService } from '../../services/fs/FsService';
import { FsSafety } from '../../services/fs/FsSafety';
import type { FileNode } from '../../state/types';
import { InlineInput, type InlineCommitTrigger } from './InlineInput';
import {
  ensureMarkdownExtension,
  flattenFileNodes,
  findNodeByPath,
  filterVisibleNodes,
  getDisplayName,
  getFileExtension,
  getParentPath,
  hasInvalidNodeName,
  resolveCreateBasePath,
} from './pathing';
import { dispatchExplorerCommand, EXPLORER_COMMANDS } from './explorerCommands';
import { matchExplorerShortcut } from './explorerKeybindings';
import {
  Search,
  Folder,
  FolderOpen,
  FileText,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

type GhostNode = {
  parentPath: string | null;
  type: 'file' | 'directory';
};

export function Sidebar() {
  const { nodes, selectedPath, setSelectedPath } = useFileTreeStore();
  const { currentPath, activeFile } = useWorkspaceStore();
  const visibleNodes = filterVisibleNodes(nodes);
  const [ghostNode, setGhostNode] = useState<GhostNode | null>(null);
  const [pendingDeleteNode, setPendingDeleteNode] = useState<FileNode | null>(
    null,
  );
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameTrigger, setRenameTrigger] = useState(0);
  const [explorerFocus, setExplorerFocus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);

  const selectedNode = selectedPath
    ? findNodeByPath(visibleNodes, selectedPath)
    : null;

  useEffect(() => {
    if (ghostNode || renamingPath) {
      setSearchQuery('');
    }
  }, [ghostNode, renamingPath]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const searchMatches = useMemo(() => {
    if (!currentPath || !normalizedQuery) {
      return [] as FileNode[];
    }

    const workspacePrefix = currentPath.endsWith('/')
      ? currentPath
      : `${currentPath}/`;

    const toRelativePath = (path: string): string =>
      path.startsWith(workspacePrefix)
        ? path.slice(workspacePrefix.length)
        : path;

    const allFiles = flattenFileNodes(visibleNodes);
    return allFiles.filter((node) => {
      const name = node.name.toLowerCase();
      const fullPath = node.path.toLowerCase();
      const relativePath = toRelativePath(node.path).toLowerCase();
      return (
        name.includes(normalizedQuery) ||
        fullPath.includes(normalizedQuery) ||
        relativePath.includes(normalizedQuery)
      );
    });
  }, [currentPath, normalizedQuery, visibleNodes]);

  const isSearchActive = Boolean(currentPath && normalizedQuery);

  useEffect(() => {
    if (!isSearchActive) {
      setSearchActiveIndex(0);
      return;
    }

    setSearchActiveIndex((idx) => {
      if (searchMatches.length === 0) {
        return 0;
      }
      if (idx < 0) return 0;
      if (idx >= searchMatches.length) return searchMatches.length - 1;
      return idx;
    });
  }, [isSearchActive, searchMatches.length]);

  const openSearchMatch = (match: FileNode | undefined): void => {
    if (!match) {
      return;
    }
    setSelectedPath(match.path);
    void openFile(match.path);
  };

  const startCreate = (type: 'file' | 'directory') => {
    if (!currentPath) {
      return;
    }
    const basePath = resolveCreateBasePath({
      currentPath,
      selectedPath,
      selectedType: selectedNode?.type ?? null,
      activeFile,
    });
    setGhostNode({
      parentPath: basePath === currentPath ? null : basePath,
      type,
    });
  };

  const cancelCreate = () => {
    setGhostNode(null);
  };

  const commitCreate = async (
    nameRaw: string,
    trigger: InlineCommitTrigger,
  ): Promise<void> => {
    if (!ghostNode || !currentPath) {
      return;
    }

    const trimmed = nameRaw.trim();
    if (!trimmed) {
      cancelCreate();
      return;
    }

    const nodeName =
      ghostNode.type === 'file' ? ensureMarkdownExtension(trimmed) : trimmed;

    if (hasInvalidNodeName(nodeName)) {
      if (trigger === 'enter') {
        useStatusStore.getState().setStatus('error', 'Invalid name');
      } else {
        cancelCreate();
      }
      return;
    }

    const basePath = ghostNode.parentPath || currentPath;
    const fullPath = `${basePath}/${nodeName}`.replace(/\/+/g, '/');

    try {
      if (ghostNode.type === 'file') {
        await FsService.createFile(fullPath);
      } else {
        await FsService.createDir(fullPath);
      }

      const refreshedNodes = await FsService.listTree(currentPath);
      useFileTreeStore.getState().setNodes(refreshedNodes);
      setSelectedPath(fullPath);

      if (ghostNode.type === 'file') {
        await openFile(fullPath);
      }

      cancelCreate();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (trigger === 'enter') {
        useStatusStore
          .getState()
          .setStatus('error', `Failed to create: ${message}`);
      } else {
        cancelCreate();
      }
    }
  };

  const beginRenameSelection = () => {
    if (!selectedNode) {
      return;
    }
    setRenamingPath(selectedNode.path);
    setRenameTrigger((v) => v + 1);
  };

  const requestDeleteSelection = () => {
    if (!selectedNode) {
      return;
    }
    setPendingDeleteNode(selectedNode);
  };

  const commandCtx = {
    hasWorkspace: Boolean(currentPath),
    hasSelection: Boolean(selectedNode),
    openWorkspace,
    beginCreateFile: () => startCreate('file'),
    beginCreateFolder: () => startCreate('directory'),
    beginRenameSelection,
    requestDeleteSelection,
    showWorkspaceRequiredAlert: () =>
      useStatusStore
        .getState()
        .setStatus('error', 'Please open a workspace first.'),
  };

  useEffect(() => {
    const inputActive = ghostNode !== null || renamingPath !== null;
    const modalOpen = pendingDeleteNode !== null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!explorerFocus || inputActive || modalOpen) {
        return;
      }

      const command = matchExplorerShortcut(event);
      if (!command) {
        return;
      }

      event.preventDefault();
      dispatchExplorerCommand(command, commandCtx);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commandCtx is an object literal recreated every render; adding it would cause listener re-subscription on every render. Actual reactive deps are already listed.
  }, [explorerFocus, ghostNode, renamingPath, pendingDeleteNode, selectedNode]);

  return (
    <div
      className="h-full flex flex-col bg-gray-50/50 border-r border-gray-200 w-64 flex-shrink-0 select-none"
      tabIndex={0}
      onFocusCapture={() => setExplorerFocus(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setExplorerFocus(false);
        }
      }}
    >
      <div
        className="p-3 border-b border-gray-200 flex items-center justify-between bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              dispatchExplorerCommand(EXPLORER_COMMANDS.NEW_FILE, commandCtx)
            }
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="New File"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={() =>
              dispatchExplorerCommand(EXPLORER_COMMANDS.NEW_FOLDER, commandCtx)
            }
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="New Folder"
          >
            <FolderPlus size={16} />
          </button>
          <button
            onClick={() =>
              dispatchExplorerCommand(
                EXPLORER_COMMANDS.OPEN_WORKSPACE,
                commandCtx,
              )
            }
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="Open Folder"
          >
            <FolderOpen size={16} />
          </button>
        </div>
      </div>

      <div
        className="px-3 py-2 border-b border-gray-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <label htmlFor="explorer-search" className="sr-only">
          Search files
        </label>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="explorer-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (!isSearchActive) {
                return;
              }

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (searchMatches.length === 0) return;
                setSearchActiveIndex((v) => (v + 1) % searchMatches.length);
                return;
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (searchMatches.length === 0) return;
                setSearchActiveIndex(
                  (v) => (v - 1 + searchMatches.length) % searchMatches.length,
                );
                return;
              }

              if (e.key === 'Enter') {
                if (searchMatches.length === 0) return;
                e.preventDefault();
                openSearchMatch(searchMatches[searchActiveIndex]);
              }
            }}
            disabled={!currentPath}
            placeholder={
              currentPath ? 'Search files…' : 'Open a folder to search'
            }
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-7 pr-7 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
            aria-label="Search files"
            aria-controls={
              isSearchActive ? 'explorer-search-results' : undefined
            }
            aria-activedescendant={
              isSearchActive && searchMatches.length > 0
                ? `explorer-search-option-${searchActiveIndex}`
                : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
              aria-label="Clear search"
              title="Clear"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-2"
        onClick={(e) => {
          if (e.currentTarget === e.target) {
            setSelectedPath(null);
          }
        }}
      >
        {isSearchActive ? (
          <div>
            {searchMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                <Search size={24} className="mb-2 opacity-20" />
                <span>No matches</span>
                <span className="mt-1 text-xs text-gray-400">
                  Try a different name or path
                </span>
              </div>
            ) : (
              <div
                id="explorer-search-results"
                role="listbox"
                aria-label="Search results"
                className="space-y-0.5"
              >
                {searchMatches.map((node, idx) => {
                  const isActive = idx === searchActiveIndex;
                  const workspacePrefix = currentPath
                    ? currentPath.endsWith('/')
                      ? currentPath
                      : `${currentPath}/`
                    : '';
                  const relativePath =
                    workspacePrefix && node.path.startsWith(workspacePrefix)
                      ? node.path.slice(workspacePrefix.length)
                      : node.path;
                  return (
                    <button
                      key={node.path}
                      id={`explorer-search-option-${idx}`}
                      role="option"
                      aria-selected={isActive}
                      type="button"
                      onMouseEnter={() => setSearchActiveIndex(idx)}
                      onClick={() => openSearchMatch(node)}
                      className={`w-full text-left group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer text-sm text-gray-700 transition-colors duration-150 ease-in-out ${
                        isActive ? 'bg-blue-100/80' : 'hover:bg-gray-200/60'
                      }`}
                      title={node.path}
                    >
                      <FileText
                        size={16}
                        className="text-gray-500 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate leading-none">
                          {getDisplayName(node)}
                        </div>
                        <div className="truncate mt-0.5 text-[11px] text-gray-400">
                          {relativePath}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : visibleNodes.length === 0 && !ghostNode ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
            <Folder size={24} className="mb-2 opacity-20" />
            <span>
              {currentPath ? 'No markdown files' : 'No folder opened'}
            </span>
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
            {ghostNode && ghostNode.parentPath === null && (
              <GhostRow
                level={0}
                type={ghostNode.type}
                onCommit={commitCreate}
                onCancel={cancelCreate}
              />
            )}

            {visibleNodes.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                level={0}
                selectedPath={selectedPath}
                renamingPath={renamingPath}
                renameTrigger={renameTrigger}
                ghostNode={ghostNode}
                onGhostCommit={commitCreate}
                onGhostCancel={cancelCreate}
                onRequestDelete={(target) => setPendingDeleteNode(target)}
                onRequestRenameStart={(path) => setRenamingPath(path)}
                onRequestRenameEnd={() => setRenamingPath(null)}
                onSelect={(path) => setSelectedPath(path)}
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

function GhostRow({
  level,
  type,
  onCommit,
  onCancel,
}: {
  level: number;
  type: 'file' | 'directory';
  onCommit: (name: string, trigger: InlineCommitTrigger) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 py-1 px-2 rounded-md text-sm text-gray-700"
      style={{ paddingLeft: `${level * 12 + 8}px` }}
    >
      <span className="text-gray-400 flex-shrink-0">
        {type === 'directory' ? (
          <Folder size={16} className="text-blue-500" />
        ) : (
          <FileText size={16} className="text-gray-500" />
        )}
      </span>
      <InlineInput
        value=""
        placeholder={type === 'file' ? 'untitled' : 'new-folder'}
        onCommit={onCommit}
        onCancel={() => onCancel()}
        autoFocus={true}
      />
    </div>
  );
}

function FileTreeNode({
  node,
  level,
  selectedPath,
  renamingPath,
  renameTrigger,
  ghostNode,
  onGhostCommit,
  onGhostCancel,
  onRequestDelete,
  onRequestRenameStart,
  onRequestRenameEnd,
  onSelect,
}: {
  node: FileNode;
  level: number;
  selectedPath: string | null;
  renamingPath: string | null;
  renameTrigger: number;
  ghostNode: GhostNode | null;
  onGhostCommit: (name: string, trigger: InlineCommitTrigger) => Promise<void>;
  onGhostCancel: () => void;
  onRequestDelete: (node: FileNode) => void;
  onRequestRenameStart: (path: string) => void;
  onRequestRenameEnd: () => void;
  onSelect: (path: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(getDisplayName(node));
  const isDirectory = node.type === 'directory';
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  useEffect(() => {
    if (renamingPath === node.path) {
      setRenameDraft(getDisplayName(node));
      setIsRenaming(true);
    }
  }, [node, renamingPath, renameTrigger]);

  useEffect(() => {
    if (isDirectory && ghostNode?.parentPath === node.path && !isExpanded) {
      setIsExpanded(true);
    }
  }, [ghostNode, isDirectory, isExpanded, node.path]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);

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
    onRequestRenameStart(node.path);
    setRenameDraft(getDisplayName(node));
    setIsRenaming(true);
  };

  const commitRename = async (
    nameRaw: string,
    trigger: InlineCommitTrigger,
  ): Promise<void> => {
    const oldName = getDisplayName(node);
    const newName = nameRaw.trim();

    if (!newName || newName === oldName) {
      setIsRenaming(false);
      onRequestRenameEnd();
      return;
    }

    if (hasInvalidNodeName(newName)) {
      if (trigger === 'enter') {
        useStatusStore.getState().setStatus('error', 'Invalid name');
      }
      setRenameDraft(oldName);
      setIsRenaming(false);
      onRequestRenameEnd();
      return;
    }

    const success = await FsSafety.flushAffectedFiles(node.path);
    if (!success) {
      if (trigger === 'enter') {
        useStatusStore
          .getState()
          .setStatus('error', 'Failed to save changes before rename');
      }
      setRenameDraft(oldName);
      setIsRenaming(false);
      onRequestRenameEnd();
      return;
    }

    const parentPath = getParentPath(node.path);
    const newFileName =
      node.type === 'file'
        ? `${newName}${getFileExtension(node.name) || '.md'}`
        : newName;
    const newPath = parentPath ? `${parentPath}/${newFileName}` : newFileName;

    try {
      await fileActions.renamePath(node.path, newPath);

      onSelect(newPath);
    } catch (error) {
      if (trigger === 'enter') {
        const message = error instanceof Error ? error.message : String(error);
        useStatusStore
          .getState()
          .setStatus('error', `Failed to rename: ${message}`);
      }
      setRenameDraft(oldName);
    } finally {
      setIsRenaming(false);
      onRequestRenameEnd();
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
          <InlineInput
            value={renameDraft}
            onCommit={commitRename}
            onCancel={() => {
              setRenameDraft(getDisplayName(node));
              setIsRenaming(false);
              onRequestRenameEnd();
            }}
            autoFocus={true}
          />
        ) : (
          <span className="truncate flex-1 leading-none py-0.5">
            {getDisplayName(node)}
          </span>
        )}

        {!isRenaming && (
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

      {isDirectory && isExpanded && (
        <div>
          {ghostNode && ghostNode.parentPath === node.path && (
            <GhostRow
              level={level + 1}
              type={ghostNode.type}
              onCommit={onGhostCommit}
              onCancel={onGhostCancel}
            />
          )}
          {hasChildren &&
            node.children!.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                renamingPath={renamingPath}
                renameTrigger={renameTrigger}
                ghostNode={ghostNode}
                onGhostCommit={onGhostCommit}
                onGhostCancel={onGhostCancel}
                onRequestDelete={onRequestDelete}
                onRequestRenameStart={onRequestRenameStart}
                onRequestRenameEnd={onRequestRenameEnd}
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
      useStatusStore
        .getState()
        .setStatus('error', 'Failed to save changes before delete');
      return;
    }

    try {
      await fileActions.deletePath(node.path);
      onConfirm();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      useStatusStore
        .getState()
        .setStatus('error', `Failed to delete: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
        <h3 className="text-sm font-semibold text-gray-900">
          Delete confirmation
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Delete{' '}
          <span className="font-medium text-gray-900">
            {getDisplayName(node)}
          </span>
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
