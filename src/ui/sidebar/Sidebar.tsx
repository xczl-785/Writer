/**
 * Sidebar Component with File Tree and Context Menu
 *
 * @see docs/current/PM/V5 功能清单.md - INT-010: 文件树右键菜单
 */

import { useEffect, useMemo, useState } from 'react';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { useStatusStore } from '../../state/slices/statusSlice';
import { fileActions } from '../../state/actions/fileActions';
import { openWorkspace, openFile } from '../../workspace/WorkspaceManager';
import { FsService } from '../../services/fs/FsService';
import { FsSafety } from '../../services/fs/FsSafety';
import type { FileNode } from '../../state/types';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import { getFileTreeMenuItems } from '../components/ContextMenu/fileTreeMenu';
import { showDeleteConfirmDialog } from '../components/Dialog';
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
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  FilePlus,
  FolderPlus,
  X,
} from 'lucide-react';

type GhostNode = {
  parentPath: string | null;
  type: 'file' | 'directory';
};

export function Sidebar() {
  const { nodes, selectedPath, setSelectedPath } = useFileTreeStore();
  const { currentPath, activeFile } = useWorkspaceStore();
  const contextMenu = useContextMenu();
  const visibleNodes = filterVisibleNodes(nodes);
  const [ghostNode, setGhostNode] = useState<GhostNode | null>(null);
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
    void confirmDeleteNode(selectedNode);
  };

  const copyPathToClipboard = async (path: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(path);
      useStatusStore.getState().setStatus('idle', 'Path copied');
    } catch {
      useStatusStore
        .getState()
        .setStatus('error', 'Failed to copy path to clipboard');
    }
  };

  const revealInFileManager = async (path: string): Promise<void> => {
    try {
      await FsService.revealInFileManager(path);
    } catch {
      useStatusStore
        .getState()
        .setStatus('error', 'Failed to reveal path in file manager');
    }
  };

  const confirmDeleteNode = async (node: FileNode): Promise<void> => {
    const displayName = getDisplayName(node);
    const confirmed = await showDeleteConfirmDialog(
      displayName,
      node.type === 'directory',
    );
    if (!confirmed) {
      return;
    }
    const success = await FsSafety.flushAffectedFiles(node.path);
    if (!success) {
      useStatusStore
        .getState()
        .setStatus('error', 'Failed to save changes before delete');
      return;
    }

    try {
      await fileActions.deletePath(node.path);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      useStatusStore
        .getState()
        .setStatus('error', `Failed to delete: ${message}`);
    }
  };

  const openNodeContextMenu = (event: React.MouseEvent, node: FileNode) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedPath(node.path);

    const isReservedPath = Boolean(currentPath && node.path === currentPath);
    const items = getFileTreeMenuItems({
      node,
      isReservedPath,
      onNewFile: () => {
        setSelectedPath(node.path);
        startCreate('file');
      },
      onNewFolder: () => {
        setSelectedPath(node.path);
        startCreate('directory');
      },
      onRename: () => {
        setSelectedPath(node.path);
        setRenamingPath(node.path);
        setRenameTrigger((v) => v + 1);
      },
      onRevealInFinder: () => {
        void revealInFileManager(node.path);
      },
      onCopyPath: () => {
        void copyPathToClipboard(node.path);
      },
      onDelete: () => {
        void confirmDeleteNode(node);
      },
    });

    contextMenu.open(event.clientX, event.clientY, items);
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (!explorerFocus || inputActive || contextMenu.state.isOpen) {
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
  }, [
    explorerFocus,
    ghostNode,
    renamingPath,
    selectedNode,
    contextMenu.state.isOpen,
  ]);

  return (
    <div
      className="h-full w-64 flex-shrink-0 select-none border-r border-zinc-200 bg-zinc-50 flex flex-col"
      tabIndex={0}
      onFocusCapture={() => setExplorerFocus(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setExplorerFocus(false);
        }
      }}
    >
      <div
        className="h-10 px-3 flex items-center justify-between border-b border-zinc-200/70"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              dispatchExplorerCommand(EXPLORER_COMMANDS.NEW_FILE, commandCtx)
            }
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 transition-colors"
            title="New File"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={() =>
              dispatchExplorerCommand(EXPLORER_COMMANDS.NEW_FOLDER, commandCtx)
            }
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 transition-colors"
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
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 transition-colors"
            title="Open Folder"
          >
            <FolderOpen size={16} />
          </button>
        </div>
      </div>

      <div
        className="px-3 py-2 border-b border-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <label htmlFor="explorer-search" className="sr-only">
          Search files
        </label>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400"
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
            className="w-full bg-white border border-zinc-200 rounded-md py-1.5 pl-8 pr-7 text-xs text-zinc-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400 disabled:opacity-60"
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
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700"
              aria-label="Clear search"
              title="Clear"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5"
        onClick={(e) => {
          if (e.currentTarget === e.target) {
            setSelectedPath(null);
          }
        }}
      >
        {isSearchActive ? (
          <div>
            {searchMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-400 text-sm">
                <Search size={24} className="mb-2 opacity-20" />
                <span>No matches</span>
                <span className="mt-1 text-xs text-zinc-400">
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
                      className={`w-full text-left group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer text-sm text-zinc-700 transition-colors duration-150 ease-in-out ${
                        isActive ? 'bg-blue-100/80' : 'hover:bg-zinc-200/60'
                      }`}
                      title={node.path}
                    >
                      <FileText
                        size={16}
                        className="text-zinc-500 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate leading-none">
                          {getDisplayName(node)}
                        </div>
                        <div className="truncate mt-0.5 text-[11px] text-zinc-400">
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
          <div className="flex flex-col items-center justify-center h-32 text-zinc-400 text-sm">
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
                activeFile={activeFile}
                renamingPath={renamingPath}
                renameTrigger={renameTrigger}
                ghostNode={ghostNode}
                onGhostCommit={commitCreate}
                onGhostCancel={cancelCreate}
                onOpenContextMenu={openNodeContextMenu}
                onRequestRenameStart={(path) => setRenamingPath(path)}
                onRequestRenameEnd={() => setRenamingPath(null)}
                onSelect={(path) => setSelectedPath(path)}
              />
            ))}
          </div>
        )}
      </div>

      <ContextMenu
        isOpen={contextMenu.state.isOpen}
        x={contextMenu.state.x}
        y={contextMenu.state.y}
        items={contextMenu.state.items}
        onClose={contextMenu.close}
      />
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
      className="flex items-center gap-1.5 py-1.5 px-2 rounded-md text-sm text-zinc-700"
      style={{ paddingLeft: `${level * 12 + 8}px` }}
    >
      <span className="w-4" aria-hidden="true" />
      <span className="text-zinc-400 flex-shrink-0">
        {type === 'directory' ? (
          <Folder size={16} className="text-blue-500" />
        ) : (
          <FileText size={16} className="text-zinc-500" />
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
  activeFile,
  renamingPath,
  renameTrigger,
  ghostNode,
  onGhostCommit,
  onGhostCancel,
  onOpenContextMenu,
  onRequestRenameStart,
  onRequestRenameEnd,
  onSelect,
}: {
  node: FileNode;
  level: number;
  selectedPath: string | null;
  activeFile: string | null;
  renamingPath: string | null;
  renameTrigger: number;
  ghostNode: GhostNode | null;
  onGhostCommit: (name: string, trigger: InlineCommitTrigger) => Promise<void>;
  onGhostCancel: () => void;
  onOpenContextMenu: (event: React.MouseEvent, node: FileNode) => void;
  onRequestRenameStart: (path: string) => void;
  onRequestRenameEnd: () => void;
  onSelect: (path: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(getDisplayName(node));
  const isDirectory = node.type === 'directory';
  const hasChildren = node.children && node.children.length > 0;
  const isFocused = selectedPath === node.path;
  const isActiveFile = node.type === 'file' && activeFile === node.path;
  const isActiveParent =
    isDirectory &&
    Boolean(activeFile) &&
    getParentPath(activeFile as string) === node.path;

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

  return (
    <div>
      <div
        className={`group relative flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors duration-150 ease-in-out ${
          isDirectory
            ? isFocused
              ? 'bg-zinc-200 text-zinc-800'
              : isActiveParent
                ? 'text-zinc-500'
                : 'text-zinc-300 hover:bg-zinc-200/40'
            : isActiveFile && isFocused
              ? 'bg-blue-50 text-zinc-900'
              : isFocused
                ? 'bg-zinc-200 text-zinc-800'
                : 'text-zinc-700 hover:bg-zinc-200/50'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(event) => onOpenContextMenu(event, node)}
      >
        {isActiveFile ? (
          <span
            className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-blue-500"
            aria-hidden="true"
          />
        ) : null}
        {isDirectory ? (
          <span
            className={`transition-colors flex-shrink-0 ${
              isFocused
                ? 'text-zinc-800'
                : isActiveParent
                  ? 'text-zinc-500'
                  : 'text-zinc-300 group-hover:text-zinc-500'
            }`}
            aria-hidden="true"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="w-3.5" aria-hidden="true" />
        )}
        <span
          className={`transition-colors flex-shrink-0 ${
            isDirectory
              ? isFocused
                ? 'text-zinc-800'
                : isActiveParent
                  ? 'text-zinc-500'
                  : 'text-zinc-300 group-hover:text-zinc-500'
              : isActiveFile
                ? 'text-blue-500'
                : isFocused
                  ? 'text-zinc-700'
                  : 'text-zinc-500'
          }`}
        >
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen size={16} />
            ) : (
              <Folder size={16} />
            )
          ) : (
            <FileText size={16} />
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
          <span
            className={`truncate flex-1 leading-none py-0.5 ${
              isDirectory
                ? isFocused
                  ? 'font-semibold text-zinc-800'
                  : isActiveParent
                    ? 'font-medium text-zinc-500'
                    : 'text-zinc-500'
                : isActiveFile
                  ? isFocused
                    ? 'font-semibold text-zinc-900'
                    : 'font-medium text-zinc-900'
                  : isFocused
                    ? 'font-medium text-zinc-800'
                    : ''
            }`}
          >
            {getDisplayName(node)}
          </span>
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
                activeFile={activeFile}
                renamingPath={renamingPath}
                renameTrigger={renameTrigger}
                ghostNode={ghostNode}
                onGhostCommit={onGhostCommit}
                onGhostCancel={onGhostCancel}
                onOpenContextMenu={onOpenContextMenu}
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
