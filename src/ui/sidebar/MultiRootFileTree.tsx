// src/ui/sidebar/MultiRootFileTree.tsx
// V6 多根文件树容器组件 - 支持空白处右键菜单和虚拟滚动

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import { useFileTreeStore } from '../domains/file/state/fileStore';
import {
  useWorkspaceStore,
  getWorkspaceType,
} from '../domains/workspace/state/workspaceStore';
import { useStatusStore } from '../../state/slices/statusSlice';
import { WorkspaceRootHeader } from './WorkspaceRootHeader';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import { getEmptyAreaMenuItems } from '../components/ContextMenu/workspaceRootMenu';
import { addFolderToWorkspaceByDialog } from '../../domains/workspace/services/WorkspaceManager';
import { FsService } from '../domains/file/services/FsService';
import { FsSafety } from '../../services/fs/FsSafety';
import { fileActions } from '../domains/file/services/fileActions';
import { t } from '../../i18n';
import type { FileNode } from '../../state/types';
import {
  VirtualizedFileTree,
  flattenMultipleRoots,
} from '../components/VirtualizedFileTree';
import {
  getDisplayName,
  getFileExtension,
  getParentPath,
  hasInvalidNodeName,
} from './pathing';
import { InlineInput, type InlineCommitTrigger } from './InlineInput';
import { joinPath } from '../../utils/pathUtils';
import { ChevronDown, ChevronRight, File } from 'lucide-react';

// 虚拟滚动阈值
const VIRTUAL_SCROLL_THRESHOLD = 100;

interface GhostNodeState {
  parentPath: string | null;
  type: 'file' | 'directory';
  rootPath: string;
}

interface MultiRootFileTreeProps {
  ghostNode?: GhostNodeState | null;
  onGhostCommit?: (name: string, trigger: 'enter' | 'blur') => Promise<void>;
  onGhostCancel?: () => void;
  selectedPath?: string | null;
  activeFile?: string | null;
  renamingPath?: string | null;
  renameTrigger?: number;
  onOpenContextMenu?: (
    event: React.MouseEvent,
    node: FileNode,
    rootPath: string,
  ) => void;
  onRequestRenameStart?: (path: string) => void;
  onRequestRenameEnd?: () => void;
  onSelect?: (path: string) => void;
  onSetGhostNode?: (ghost: GhostNodeState | null) => void;
  renderTreeNode?: (node: FileNode, rootPath: string) => React.ReactNode;
}

// 文件夹图标组件
function FolderIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  if (filled) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M10 4H4.8A2.8 2.8 0 0 0 2 6.8v10.4A2.8 2.8 0 0 0 4.8 20h14.4A2.8 2.8 0 0 0 22 17.2V8.8A2.8 2.8 0 0 0 19.2 6H12z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7.8A2.8 2.8 0 0 1 5.8 5H10l2 2h6.2A2.8 2.8 0 0 1 21 9.8v8.4A2.8 2.8 0 0 1 18.2 21H5.8A2.8 2.8 0 0 1 3 18.2z" />
    </svg>
  );
}

// Ghost 节点行（新建文件/文件夹时显示）
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
          <FolderIcon className="h-4 w-4 text-blue-500" />
        ) : (
          <File size={16} className="text-zinc-500" />
        )}
      </span>
      <InlineInput
        value=""
        placeholder={
          type === 'file'
            ? t('sidebar.untitled')
            : t('sidebar.newFolderPlaceholder')
        }
        onCommit={onCommit}
        onCancel={() => onCancel()}
        autoFocus={true}
      />
    </div>
  );
}

// 简单文件树节点渲染（非虚拟滚动模式）
function SimpleFileTreeNode({
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
  rootPath,
}: {
  node: FileNode;
  level: number;
  selectedPath: string | null;
  activeFile: string | null;
  renamingPath: string | null;
  renameTrigger: number;
  ghostNode: GhostNodeState | null;
  onGhostCommit: (name: string, trigger: InlineCommitTrigger) => Promise<void>;
  onGhostCancel: () => void;
  onOpenContextMenu: (event: React.MouseEvent, node: FileNode) => void;
  onRequestRenameStart: (path: string) => void;
  onRequestRenameEnd: () => void;
  onSelect: (path: string) => void;
  rootPath: string;
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
        useStatusStore.getState().setStatus('error', t('sidebar.invalidName'));
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
          .setStatus('error', t('sidebar.saveBeforeRename'));
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
    const newPath = parentPath
      ? joinPath(parentPath, newFileName)
      : newFileName;

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
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
        onContextMenu={(event) => onOpenContextMenu(event, node)}
        role="treeitem"
        tabIndex={0}
        aria-expanded={isDirectory ? isExpanded : undefined}
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
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
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
            <FolderIcon
              className="h-4 w-4"
              filled={isFocused || isActiveParent}
            />
          ) : (
            <File size={16} />
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
              <SimpleFileTreeNode
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
                rootPath={rootPath}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export const MultiRootFileTree: React.FC<MultiRootFileTreeProps> = ({
  ghostNode: externalGhostNode,
  onGhostCommit: externalOnGhostCommit,
  onGhostCancel: externalOnGhostCancel,
  selectedPath: externalSelectedPath,
  activeFile: externalActiveFile,
  renamingPath: externalRenamingPath,
  renameTrigger: externalRenameTrigger,
  onOpenContextMenu: externalOnOpenContextMenu,
  onRequestRenameStart: externalOnRequestRenameStart,
  onRequestRenameEnd: externalOnRequestRenameEnd,
  onSelect: externalOnSelect,
  onSetGhostNode,
  renderTreeNode,
}) => {
  const rootFolders = useFileTreeStore((state) => state.rootFolders);
  const loadingPaths = useFileTreeStore((state) => state.loadingPaths);
  const errorPaths = useFileTreeStore((state) => state.errorPaths);
  const expandedPaths = useFileTreeStore((state) => state.expandedPaths);
  const toggleNode = useFileTreeStore((state) => state.toggleNode);
  const setNodes = useFileTreeStore((state) => state.setNodes);
  const folders = useWorkspaceStore((state) => state.folders);
  const contextMenu = useContextMenu();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(500);

  // 内部状态（如果外部没有提供）
  const [internalGhostNode, setInternalGhostNode] =
    useState<GhostNodeState | null>(null);
  const [internalRenamingPath, setInternalRenamingPath] = useState<
    string | null
  >(null);
  const [internalRenameTrigger, setInternalRenameTrigger] = useState(0);
  const internalSelectedPath = useFileTreeStore((state) => state.selectedPath);
  const setSelectedPath = useFileTreeStore((state) => state.setSelectedPath);
  const internalActiveFile = useWorkspaceStore((state) => state.activeFile);

  // 使用外部或内部状态
  const ghostNode = externalGhostNode ?? internalGhostNode;
  const selectedPath = externalSelectedPath ?? internalSelectedPath;
  const activeFile = externalActiveFile ?? internalActiveFile;
  const renamingPath = externalRenamingPath ?? internalRenamingPath;
  const renameTrigger = externalRenameTrigger ?? internalRenameTrigger;

  const workspaceType = getWorkspaceType({
    folders,
    workspaceFile: null,
    isDirty: false,
    openFiles: [],
    activeFile: null,
  });

  const hasWorkspace = rootFolders.length > 0;

  // 获取第一个根路径作为默认创建位置
  const firstRootPath =
    rootFolders.length > 0 ? rootFolders[0].workspacePath : null;

  // 计算容器高度
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // 扁平化文件树用于虚拟滚动
  const flattenedNodes = useMemo(() => {
    return flattenMultipleRoots(rootFolders, expandedPaths);
  }, [rootFolders, expandedPaths]);

  // 判断是否使用虚拟滚动
  const shouldUseVirtualization =
    flattenedNodes.length > VIRTUAL_SCROLL_THRESHOLD;

  const handleAddFolderToWorkspace = useCallback(() => {
    void addFolderToWorkspaceByDialog();
  }, []);

  const handleNewFile = useCallback(() => {
    if (!firstRootPath || !onSetGhostNode) return;
    onSetGhostNode({
      parentPath: null,
      type: 'file',
      rootPath: firstRootPath,
    });
  }, [firstRootPath, onSetGhostNode]);

  const handleNewFolder = useCallback(() => {
    if (!firstRootPath || !onSetGhostNode) return;
    onSetGhostNode({
      parentPath: null,
      type: 'directory',
      rootPath: firstRootPath,
    });
  }, [firstRootPath, onSetGhostNode]);

  const handleEmptyAreaContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const items = getEmptyAreaMenuItems({
        onAddFolderToWorkspace: handleAddFolderToWorkspace,
        onNewFile: handleNewFile,
        onNewFolder: handleNewFolder,
        hasWorkspace,
      });

      contextMenu.open(event.clientX, event.clientY, items);
    },
    [
      handleAddFolderToWorkspace,
      handleNewFile,
      handleNewFolder,
      hasWorkspace,
      contextMenu,
    ],
  );

  // 处理 ghost 节点提交
  const handleGhostCommit = useCallback(
    async (name: string, trigger: InlineCommitTrigger): Promise<void> => {
      if (!ghostNode) return;

      const targetRootPath = ghostNode.rootPath;
      if (!targetRootPath) return;

      const trimmed = name.trim();
      if (!trimmed) {
        if (onSetGhostNode) {
          onSetGhostNode(null);
        } else {
          setInternalGhostNode(null);
        }
        return;
      }

      const nodeName = ghostNode.type === 'file' ? `${trimmed}.md` : trimmed;

      if (hasInvalidNodeName(nodeName)) {
        if (trigger === 'enter') {
          useStatusStore
            .getState()
            .setStatus('error', t('sidebar.invalidName'));
        }
        return;
      }

      const basePath = ghostNode.parentPath || targetRootPath;
      const fullPath = joinPath(basePath, nodeName);

      try {
        if (ghostNode.type === 'file') {
          await FsService.createFile(fullPath);
        } else {
          await FsService.createDir(fullPath);
        }

        // 刷新对应根文件夹的树
        const refreshedNodes = await FsService.listTree(targetRootPath);
        setNodes(targetRootPath, refreshedNodes);
        setSelectedPath(fullPath);

        if (onSetGhostNode) {
          onSetGhostNode(null);
        } else {
          setInternalGhostNode(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (trigger === 'enter') {
          useStatusStore
            .getState()
            .setStatus('error', `Failed to create: ${message}`);
        }
      }
    },
    [ghostNode, setNodes, setSelectedPath, onSetGhostNode],
  );

  // 处理 ghost 节点取消
  const handleGhostCancel = useCallback(() => {
    if (onSetGhostNode) {
      onSetGhostNode(null);
    } else {
      setInternalGhostNode(null);
    }
  }, [onSetGhostNode]);

  // 处理选择
  const handleSelect = useCallback(
    (path: string) => {
      if (externalOnSelect) {
        externalOnSelect(path);
      } else {
        setSelectedPath(path);
      }
    },
    [externalOnSelect, setSelectedPath],
  );

  // 处理上下文菜单
  const handleOpenContextMenu = useCallback(
    (event: React.MouseEvent, node: FileNode, rootPath: string) => {
      if (externalOnOpenContextMenu) {
        externalOnOpenContextMenu(event, node, rootPath);
      } else {
        event.preventDefault();
        event.stopPropagation();
        setSelectedPath(node.path);
        // 这里可以添加默认的上下文菜单逻辑
      }
    },
    [externalOnOpenContextMenu, setSelectedPath],
  );

  // 处理重命名开始
  const handleRequestRenameStart = useCallback(
    (path: string) => {
      if (externalOnRequestRenameStart) {
        externalOnRequestRenameStart(path);
      } else {
        setInternalRenamingPath(path);
        setInternalRenameTrigger((v) => v + 1);
      }
    },
    [externalOnRequestRenameStart],
  );

  // 处理重命名结束
  const handleRequestRenameEnd = useCallback(() => {
    if (externalOnRequestRenameEnd) {
      externalOnRequestRenameEnd();
    } else {
      setInternalRenamingPath(null);
    }
  }, [externalOnRequestRenameEnd]);

  if (rootFolders.length === 0) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        className="multi-root-file-tree flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5"
        onContextMenu={handleEmptyAreaContextMenu}
      >
        {shouldUseVirtualization ? (
          // 虚拟滚动模式
          <VirtualizedFileTree
            flattenedNodes={flattenedNodes}
            containerHeight={containerHeight}
            selectedPath={selectedPath}
            activeFile={activeFile}
            renamingPath={renamingPath}
            renameTrigger={renameTrigger}
            ghostNode={ghostNode}
            onToggleExpand={toggleNode}
            onSelect={handleSelect}
            onOpenContextMenu={handleOpenContextMenu}
            onGhostCommit={handleGhostCommit}
            onGhostCancel={handleGhostCancel}
            onRequestRenameStart={handleRequestRenameStart}
            onRequestRenameEnd={handleRequestRenameEnd}
            className="flex-1"
          />
        ) : (
          // 普通渲染模式
          rootFolders.map((rootFolder) => (
            <div
              key={rootFolder.workspacePath}
              className="root-folder-group mb-2"
            >
              {/* V6: 多根模式下显示根文件夹标题 */}
              {workspaceType === 'multi' && (
                <WorkspaceRootHeader
                  folder={rootFolder}
                  isExpanded={expandedPaths.has(rootFolder.workspacePath)}
                  isSelected={selectedPath === rootFolder.workspacePath}
                  onToggle={() => toggleNode(rootFolder.workspacePath)}
                  onSelect={() => handleSelect(rootFolder.workspacePath)}
                />
              )}

              <div className="root-folder-content">
                {loadingPaths.has(rootFolder.workspacePath) ? (
                  <div className="loading-indicator px-3 py-2 text-xs text-zinc-400">
                    {t('sidebar.loading')}
                  </div>
                ) : errorPaths.has(rootFolder.workspacePath) ? (
                  <div className="error-indicator px-3 py-2 text-xs text-red-500">
                    {errorPaths.get(rootFolder.workspacePath)}
                  </div>
                ) : (
                  <>
                    {/* 根级别的 ghost 节点 */}
                    {ghostNode && ghostNode.parentPath === null && (
                      <GhostRow
                        level={0}
                        type={ghostNode.type}
                        onCommit={handleGhostCommit}
                        onCancel={handleGhostCancel}
                      />
                    )}
                    {/* 渲染文件树节点 */}
                    {rootFolder.tree.map((node) =>
                      renderTreeNode ? (
                        renderTreeNode(node, rootFolder.workspacePath)
                      ) : (
                        <SimpleFileTreeNode
                          key={node.path}
                          node={node}
                          level={0}
                          selectedPath={selectedPath}
                          activeFile={activeFile}
                          renamingPath={renamingPath}
                          renameTrigger={renameTrigger}
                          ghostNode={ghostNode}
                          onGhostCommit={
                            externalOnGhostCommit ?? handleGhostCommit
                          }
                          onGhostCancel={
                            externalOnGhostCancel ?? handleGhostCancel
                          }
                          onOpenContextMenu={(e, n) =>
                            handleOpenContextMenu(
                              e,
                              n,
                              rootFolder.workspacePath,
                            )
                          }
                          onRequestRenameStart={handleRequestRenameStart}
                          onRequestRenameEnd={handleRequestRenameEnd}
                          onSelect={handleSelect}
                          rootPath={rootFolder.workspacePath}
                        />
                      ),
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ContextMenu
        isOpen={contextMenu.state.isOpen}
        x={contextMenu.state.x}
        y={contextMenu.state.y}
        items={contextMenu.state.items}
        onClose={contextMenu.close}
      />
    </>
  );
};
