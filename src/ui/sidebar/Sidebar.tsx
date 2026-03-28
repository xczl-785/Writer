/**
 * Sidebar Component with File Tree and Context Menu
 * V6 适配版本 - 支持多根文件夹工作区
 *
 * @see docs/current/PM/V5 功能清单.md - INT-010: 文件树右键菜单
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useFileTreeStore } from '../../domains/file/state/fileStore';
import { useWorkspaceStore } from '../../domains/workspace/state/workspaceStore';
import { useStatusStore } from '../../state/slices/statusSlice';
import { fileActions } from '../../domains/file/services/fileActions';
import { workspaceActions } from '../../domains/workspace/services/workspaceActions';
import {
  addFolderPathToWorkspace,
  openWorkspaceAtPath,
  openWorkspace,
  openFile,
} from '../../domains/workspace/services/WorkspaceManager';
import { FsService } from '../../domains/file/services/FsService';
import { FsSafety } from '../../domains/file/services/FsSafety';
import { handleDropToEditor } from '../../domains/file/services/SingleFileDropHandler';
import {
  classifyDroppedPaths,
  extractDroppedPaths,
} from '../../domains/workspace/services/droppedPaths';
import {
  canCreateFromWorkspace,
  resolveCreateEntryExplorerCommand,
} from '../../domains/workspace/services/createEntryCommands';
import { resolveCreateGhostTarget } from '../../domains/workspace/services/createEntryTarget';
import type { FileNode } from '../../state/types';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import { DragDropHint } from '../components/ErrorStates';
import { getFileTreeMenuItems } from '../components/ContextMenu/fileTreeMenu';
import { showDeleteConfirmDialog } from '../components/Dialog';
import { InlineInput, type InlineCommitTrigger } from './InlineInput';
import { WorkspaceRootHeader } from './WorkspaceRootHeader';
import {
  ensureMarkdownExtension,
  flattenFileNodes,
  findNodeByPath,
  filterVisibleNodes,
  getDisplayName,
  getFileExtension,
  getParentPath,
  hasInvalidNodeName,
} from './pathing';
import { flattenMultipleRoots } from '../components/VirtualizedFileTree';
import { VirtualizedFileTree } from '../components/VirtualizedFileTree/VirtualizedFileTree';
import { joinPath, normalizePath } from '../../utils/pathUtils';
import { dispatchExplorerCommand, EXPLORER_COMMANDS } from './explorerCommands';
import { matchExplorerShortcut } from './explorerKeybindings';
import {
  Search,
  ChevronDown,
  ChevronRight,
  File,
  FilePlus,
  FolderPlus,
  X,
} from 'lucide-react';
import { t } from '../../shared/i18n';
import { ErrorService } from '../../services/error/ErrorService';

type GhostNode = {
  parentPath: string | null;
  type: 'file' | 'directory';
  rootPath: string; // V6: 记录所属根路径
};

// 拖拽状态类型
type DropPosition = 'inside' | 'above' | 'below';

type DragState = {
  isDragging: boolean;
  dragPath: string | null;
  dragType: 'file' | 'directory' | null;
  dragRootPath: string | null;
};

type DropState = {
  dropTargetPath: string | null;
  dropPosition: DropPosition | null;
};

type FolderIconProps = {
  className?: string;
  filled?: boolean;
};

function FolderIcon({ className, filled = false }: FolderIconProps) {
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

type SidebarProps = {
  isExternalDragOver?: boolean;
  dragClassificationType?: 'files' | 'folders' | null;
};

export function Sidebar({
  isExternalDragOver = false,
  dragClassificationType = null,
}: SidebarProps) {
  const sidebarSuggestion = useCallback(
    (
      key:
        | 'create'
        | 'copyPath'
        | 'reveal'
        | 'delete'
        | 'move'
        | 'rename',
    ): string => {
      switch (key) {
        case 'create':
          return t('sidebar.tryDifferent');
        case 'copyPath':
          return t('sidebar.copyRetrySuggestion');
        case 'reveal':
          return t('sidebar.revealRetrySuggestion');
        case 'delete':
          return t('sidebar.deleteRetrySuggestion');
        case 'move':
          return t('sidebar.moveRetrySuggestion');
        case 'rename':
          return t('sidebar.renameRetrySuggestion');
      }
    },
    [],
  );

  const showLevel2SidebarError = useCallback(
    (error: unknown, source: string, reason: string, suggestion: string) => {
      useStatusStore.getState().setStatus('idle', null);
      ErrorService.handleWithInfo(error, source, {
        level: 'level2',
        source,
        reason,
        suggestion,
        dedupeKey: source,
      });
    },
    [],
  );

  // V6 状态获取 - 使用 selector 模式
  const rootFolders = useFileTreeStore((state) => state.rootFolders);
  const selectedPath = useFileTreeStore((state) => state.selectedPath);
  const setSelectedPath = useFileTreeStore((state) => state.setSelectedPath);
  const setNodes = useFileTreeStore((state) => state.setNodes);
  const loadingPaths = useFileTreeStore((state) => state.loadingPaths);
  const expandedPaths = useFileTreeStore((state) => state.expandedPaths);
  const expandNode = useFileTreeStore((state) => state.expandNode);
  const toggleNode = useFileTreeStore((state) => state.toggleNode);

  const folders = useWorkspaceStore((state) => state.folders);
  const activeFile = useWorkspaceStore((state) => state.activeFile);

  const contextMenu = useContextMenu();

  // V6 兼容：计算单一工作区路径（用于单文件夹模式的兼容逻辑）
  const currentPath = folders.length > 0 ? folders[0].path : null;

  // V6: 将所有根文件夹的树合并为统一的可见节点列表（用于搜索等功能）
  const allVisibleNodes = useMemo(() => {
    const allNodes: FileNode[] = [];
    for (const rootFolder of rootFolders) {
      const filtered = filterVisibleNodes(rootFolder.tree);
      allNodes.push(...filtered);
    }
    return allNodes;
  }, [rootFolders]);

  // 虚拟滚动阈值
  const VIRTUAL_SCROLL_THRESHOLD = 100;

  // V6: 扁平化文件树用于虚拟滚动
  const flattenedNodes = useMemo(() => {
    return flattenMultipleRoots(rootFolders, expandedPaths);
  }, [rootFolders, expandedPaths]);

  // 判断是否使用虚拟滚动
  const shouldUseVirtualization =
    flattenedNodes.length > VIRTUAL_SCROLL_THRESHOLD;

  const isSamePath = useCallback((left: string, right: string): boolean => {
    return normalizePath(left) === normalizePath(right);
  }, []);

  // V6: 根据选中路径找到对应的根路径
  const getRootPathForPath = (path: string | null): string | null => {
    if (!path) return currentPath;
    const normalizedPath = normalizePath(path);
    for (const folder of rootFolders) {
      const normalizedWorkspacePath = normalizePath(folder.workspacePath);
      if (
        normalizedPath === normalizedWorkspacePath ||
        normalizedPath.startsWith(normalizedWorkspacePath + '/')
      ) {
        return folder.workspacePath;
      }
    }
    return currentPath;
  };

  const [ghostNode, setGhostNode] = useState<GhostNode | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameTrigger, setRenameTrigger] = useState(0);
  const [explorerFocus, setExplorerFocus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragPath: null,
    dragType: null,
    dragRootPath: null,
  });
  const [dropState, setDropState] = useState<DropState>({
    dropTargetPath: null,
    dropPosition: null,
  });
  const dragExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNode = selectedPath
    ? findNodeByPath(allVisibleNodes, selectedPath)
    : null;

  useEffect(() => {
    if (ghostNode || renamingPath) {
      setSearchQuery('');
    }
  }, [ghostNode, renamingPath]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // V6: 搜索逻辑适配多根
  const searchMatches = useMemo(() => {
    if (!normalizedQuery) {
      return [] as FileNode[];
    }

    const allFiles = flattenFileNodes(allVisibleNodes);
    return allFiles.filter((node) => {
      const name = node.name.toLowerCase();
      const fullPath = node.path.toLowerCase();

      // V6: 计算相对路径（相对于各自的根文件夹）
      let relativePath = fullPath;
      for (const folder of rootFolders) {
        const prefix = folder.workspacePath.endsWith('/')
          ? folder.workspacePath
          : `${folder.workspacePath}/`;
        if (fullPath.startsWith(prefix.toLowerCase())) {
          relativePath = fullPath.slice(prefix.length);
          break;
        }
      }

      return (
        name.includes(normalizedQuery) ||
        fullPath.includes(normalizedQuery) ||
        relativePath.includes(normalizedQuery)
      );
    });
  }, [normalizedQuery, allVisibleNodes, rootFolders]);

  const isSearchActive = Boolean(normalizedQuery);

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
    // V6: ???????????????????????
    const targetRootPath = getRootPathForPath(selectedPath) || currentPath;
    if (!targetRootPath) {
      return;
    }

    beginCreateWithGhost(
      resolveCreateGhostTarget({
        type,
        rootPath: targetRootPath,
        targetPath: selectedPath,
        targetType: selectedNode?.type ?? null,
        activeFile,
      }),
    );
  };

  const getCreateGhostTarget = useCallback(
    (
      type: 'file' | 'directory',
      rootPath: string,
      targetPath: string | null,
      targetType: FileNode['type'] | null,
    ): GhostNode =>
      resolveCreateGhostTarget({
        type,
        rootPath,
        targetPath,
        targetType,
        activeFile,
      }),
    [activeFile],
  );

  const beginCreateWithGhost = useCallback(
    (ghost: GhostNode) => {
      const previewDirectoryPath = ghost.parentPath ?? ghost.rootPath;
      expandNode(previewDirectoryPath);
      setGhostNode(ghost);
    },
    [expandNode, selectedPath],
  );

  const cancelCreate = () => {
    setGhostNode(null);
  };

  const commitCreate = async (
    nameRaw: string,
    trigger: InlineCommitTrigger,
  ): Promise<void> => {
    if (!ghostNode) {
      return;
    }

    const targetRootPath = ghostNode.rootPath;
    if (!targetRootPath) {
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
        useStatusStore.getState().setStatus('error', t('sidebar.invalidName'));
      } else {
        cancelCreate();
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

      // V6: 刷新对应根文件夹的树
      const refreshedNodes = await FsService.listTree(targetRootPath);
      setNodes(targetRootPath, refreshedNodes);
      setSelectedPath(fullPath);

      if (ghostNode.type === 'file') {
        await openFile(fullPath);
      }

      cancelCreate();
    } catch (error) {
      cancelCreate();
      showLevel2SidebarError(
        error,
        'sidebar-create',
        t('sidebar.createFailed'),
        sidebarSuggestion('create'),
      );
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
      useStatusStore.getState().setStatus('idle', t('sidebar.pathCopied'));
    } catch {
      showLevel2SidebarError(
        new Error(t('sidebar.copyFailed')),
        'sidebar-copy-path',
        t('sidebar.copyFailed'),
        sidebarSuggestion('copyPath'),
      );
    }
  };

  const revealInFileManager = async (path: string): Promise<void> => {
    try {
      await FsService.revealInFileManager(path);
    } catch {
      showLevel2SidebarError(
        new Error(t('sidebar.revealFailed')),
        'sidebar-reveal',
        t('sidebar.revealFailed'),
        sidebarSuggestion('reveal'),
      );
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
        .setStatus('error', t('sidebar.saveBeforeDelete'));
      return;
    }

    try {
      await fileActions.deletePath(node.path);
    } catch (error) {
      showLevel2SidebarError(
        error,
        'sidebar-delete',
        t('sidebar.deleteFailed'),
        sidebarSuggestion('delete'),
      );
    }
  };

  const openNodeContextMenu = (
    event: React.MouseEvent,
    node: FileNode,
    rootPath: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedPath(node.path);

    const isReservedPath = rootFolders.some(
      (f) => node.path === f.workspacePath,
    );
    const items = getFileTreeMenuItems({
      node,
      isReservedPath,
      onNewFile: () => {
        setSelectedPath(node.path);
        beginCreateWithGhost(
          getCreateGhostTarget('file', rootPath, node.path, node.type),
        );
      },
      onNewFolder: () => {
        setSelectedPath(node.path);
        beginCreateWithGhost(
          getCreateGhostTarget('directory', rootPath, node.path, node.type),
        );
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

  // 移动根文件夹（用于快捷键排序）
  const moveRootFolderUp = useCallback(() => {
    if (!selectedPath) return;
    // 检查选中的是否是根文件夹
    const isRootFolder = rootFolders.some(
      (f) => f.workspacePath === selectedPath,
    );
    if (!isRootFolder) return;

    workspaceActions.moveRootFolderUp(selectedPath);
  }, [selectedPath, rootFolders]);

  const moveRootFolderDown = useCallback(() => {
    if (!selectedPath) return;
    // 检查选中的是否是根文件夹
    const isRootFolder = rootFolders.some(
      (f) => f.workspacePath === selectedPath,
    );
    if (!isRootFolder) return;

    workspaceActions.moveRootFolderDown(selectedPath);
  }, [selectedPath, rootFolders]);

  // 拖拽事件处理
  const handleDragStart = useCallback(
    (
      e: React.DragEvent,
      path: string,
      type: 'file' | 'directory',
      rootPath: string,
    ) => {
      e.stopPropagation();

      // 设置拖拽数据
      const dragData = { path, type, rootPath };
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'move';

      setDragState({
        isDragging: true,
        dragPath: path,
        dragType: type,
        dragRootPath: rootPath,
      });
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    // 清除定时器
    if (dragExpandTimerRef.current) {
      clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }

    setDragState({
      isDragging: false,
      dragPath: null,
      dragType: null,
      dragRootPath: null,
    });
    setDropState({
      dropTargetPath: null,
      dropPosition: null,
    });
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetPath: string, isDirectory: boolean) => {
      e.preventDefault();
      e.stopPropagation();

      if (!dragState.isDragging || dragState.dragPath === targetPath) {
        return;
      }

      // 不允许拖到子节点
      if (targetPath.startsWith(dragState.dragPath + '/')) {
        return;
      }

      // 计算放置位置
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      let dropPosition: DropPosition;
      if (isDirectory && y > height * 0.25 && y < height * 0.75) {
        // 拖到文件夹内部
        dropPosition = 'inside';

        // 自动展开文件夹（悬停 500ms）
        if (dragExpandTimerRef.current === null) {
          dragExpandTimerRef.current = setTimeout(() => {
            toggleNode(targetPath);
            dragExpandTimerRef.current = null;
          }, 500);
        }
      } else if (y <= height * 0.5) {
        dropPosition = 'above';
        // 清除展开定时器
        if (dragExpandTimerRef.current) {
          clearTimeout(dragExpandTimerRef.current);
          dragExpandTimerRef.current = null;
        }
      } else {
        dropPosition = 'below';
        // 清除展开定时器
        if (dragExpandTimerRef.current) {
          clearTimeout(dragExpandTimerRef.current);
          dragExpandTimerRef.current = null;
        }
      }

      setDropState({
        dropTargetPath: targetPath,
        dropPosition,
      });

      // 设置拖拽效果
      e.dataTransfer.dropEffect = 'move';
    },
    [dragState, toggleNode],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    // 清除展开定时器
    if (dragExpandTimerRef.current) {
      clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }

    // 只有当离开当前元素时才清除状态
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropState({
        dropTargetPath: null,
        dropPosition: null,
      });
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetPath: string) => {
      e.preventDefault();
      e.stopPropagation();

      // 清除定时器
      if (dragExpandTimerRef.current) {
        clearTimeout(dragExpandTimerRef.current);
        dragExpandTimerRef.current = null;
      }

      if (!dragState.isDragging || !dragState.dragPath) {
        return;
      }

      const sourcePath = dragState.dragPath;
      const dropPosition = dropState.dropPosition;

      // 重置状态
      setDragState({
        isDragging: false,
        dragPath: null,
        dragType: null,
        dragRootPath: null,
      });
      setDropState({
        dropTargetPath: null,
        dropPosition: null,
      });

      if (!dropPosition) return;

      // 执行移动操作
      const result = await workspaceActions.moveNode(
        sourcePath,
        targetPath,
        dropPosition,
      );

      if (!result.ok) {
        showLevel2SidebarError(
          new Error(t('sidebar.moveFailed')),
          'sidebar-move',
          t('sidebar.moveFailed'),
          sidebarSuggestion('move'),
        );
      }
    },
    [dragState, dropState, showLevel2SidebarError, sidebarSuggestion],
  );

  const commandCtx = {
    hasWorkspace: canCreateFromWorkspace(currentPath),
    hasSelection: Boolean(selectedNode),
    openWorkspace,
    beginCreateFile: () => startCreate('file'),
    beginCreateFolder: () => startCreate('directory'),
    beginRenameSelection,
    requestDeleteSelection,
    showWorkspaceRequiredAlert: () =>
      useStatusStore
        .getState()
        .setStatus('error', t('sidebar.openWorkspaceFirst')),
    moveSelectionUp: moveRootFolderUp,
    moveSelectionDown: moveRootFolderDown,
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

  useEffect(() => {
    const onMenuCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      const command = resolveCreateEntryExplorerCommand(detail?.id ?? '');
      if (command) {
        dispatchExplorerCommand(command, commandCtx);
      }
    };

    window.addEventListener(
      'writer:sidebar-command',
      onMenuCommand as EventListener,
    );
    return () =>
      window.removeEventListener(
        'writer:sidebar-command',
        onMenuCommand as EventListener,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commandCtx is an object literal recreated every render
  }, [currentPath, selectedNode, ghostNode, renamingPath]);

  // V6: 渲染空状态 - 极简样式
  const renderEmptyState = () => (
    <div className="px-3 py-10 text-center text-[11px] text-zinc-300 italic">
      {rootFolders.length > 0 ? t('sidebar.noMarkdown') : t('sidebar.noFolder')}
    </div>
  );

  // V6: 渲染单个根文件夹的文件树
  const renderRootFolderTree = (
    rootFolder: {
      workspacePath: string;
      displayName: string;
      tree: FileNode[];
    },
    level: number = 0,
  ) => {
    const visibleNodes = filterVisibleNodes(rootFolder.tree);
    const isLoading = loadingPaths.has(rootFolder.workspacePath);
    const isExpanded = expandedPaths.has(rootFolder.workspacePath);
    const isSelected = Boolean(
      selectedPath && isSamePath(selectedPath, rootFolder.workspacePath),
    );

    return (
      <div key={rootFolder.workspacePath} className="root-folder-group">
        <WorkspaceRootHeader
          folder={rootFolder}
          isExpanded={isExpanded}
          isSelected={isSelected}
          onToggle={() => toggleNode(rootFolder.workspacePath)}
          onSelect={() => setSelectedPath(rootFolder.workspacePath)}
          onNewFile={() => {
            setSelectedPath(rootFolder.workspacePath);
            beginCreateWithGhost({
              parentPath: null,
              type: 'file',
              rootPath: rootFolder.workspacePath,
            });
          }}
          onNewFolder={() => {
            setSelectedPath(rootFolder.workspacePath);
            beginCreateWithGhost({
              parentPath: null,
              type: 'directory',
              rootPath: rootFolder.workspacePath,
            });
          }}
        />

        {ghostNode &&
        normalizePath(ghostNode.rootPath) ===
          normalizePath(rootFolder.workspacePath) &&
        ghostNode.parentPath === null ? (
          <GhostRow
            level={level + 1}
            type={ghostNode.type}
            onCommit={commitCreate}
            onCancel={cancelCreate}
          />
        ) : null}

        {isLoading ? (
          <div className="px-3 py-2 text-xs text-zinc-400">
            {t('sidebar.loading')}
          </div>
        ) : isExpanded ? (
          visibleNodes.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              level={level + 1}
              selectedPath={selectedPath}
              activeFile={activeFile}
              renamingPath={renamingPath}
              renameTrigger={renameTrigger}
              ghostNode={ghostNode}
              onGhostCommit={commitCreate}
              onGhostCancel={cancelCreate}
              onOpenContextMenu={(e, n) =>
                openNodeContextMenu(e, n, rootFolder.workspacePath)
              }
              onShowLevel2Error={showLevel2SidebarError}
              onRequestRenameStart={(path) => setRenamingPath(path)}
              onRequestRenameEnd={() => setRenamingPath(null)}
              onSelect={(path) => setSelectedPath(path)}
              rootPath={rootFolder.workspacePath}
              dragState={dragState}
              dropState={dropState}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ))
        ) : null}
      </div>
    );
  };

  return (
    <div
      className="h-full w-64 flex-shrink-0 select-none border-r border-zinc-200 bg-zinc-50 flex flex-col"
      role="region"
      aria-label={t('sidebar.title')}
      tabIndex={0}
      onFocusCapture={() => setExplorerFocus(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setExplorerFocus(false);
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
          setIsDragOver(true);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const paths = extractDroppedPaths(
          e.dataTransfer.files as FileList & {
            [index: number]: File & { path?: string };
          },
        );

        void (async () => {
          const classification = await classifyDroppedPaths(
            paths,
            FsService.getPathKind,
          );

          if (classification.files.length > 0 && rootFolders.length === 0) {
            await handleDropToEditor(classification.files[0], {
              selectedPath: null,
              rootFolders: [],
              hasWorkspace: false,
              onOpenFile: workspaceActions.openFile,
              onRefreshFileTree: async () => {},
              onShowStatus: (type, message) => {
                const status =
                  type === 'error'
                    ? 'error'
                    : type === 'info'
                      ? 'loading'
                      : 'idle';
                useStatusStore.getState().setStatus(status, message);
              },
              showConflictDialog: async () => 'cancel',
              onSetDragOver: setIsDragOver,
              onSetDropBlocked: () => {},
              isSaving: () => false,
            });
            return;
          }

          if (classification.directories.length === 0) {
            useStatusStore
              .getState()
              .setStatus('error', t('workspace.dragFoldersOnly'));
            return;
          }

          if (rootFolders.length === 0) {
            const [firstPath, ...restPaths] = classification.directories;
            const opened = await openWorkspaceAtPath(firstPath);
            if (!opened) {
              return;
            }

            for (const path of restPaths) {
              const added = await addFolderPathToWorkspace(path);
              if (!added) {
                break;
              }
            }
            return;
          }

          for (const path of classification.directories) {
            const added = await addFolderPathToWorkspace(path);
            if (!added) {
              break;
            }
          }
        })();
      }}
    >
      {/* 侧边栏头部 - 规范 2.2.1: EXPLORER 标题 + 分隔线 */}
      <div
        className="sidebar-header h-10 px-3 flex items-center justify-between border-transparent"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <span className="sidebar-title text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
          {rootFolders.length > 1 ? 'EXPLORER' : 'FILES'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              dispatchExplorerCommand(EXPLORER_COMMANDS.NEW_FILE, commandCtx)
            }
            disabled={!canCreateFromWorkspace(currentPath)}
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-500 disabled:hover:bg-transparent"
            title={t('sidebar.newFile')}
          >
            <FilePlus size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              dispatchExplorerCommand(EXPLORER_COMMANDS.NEW_FOLDER, commandCtx)
            }
            disabled={!canCreateFromWorkspace(currentPath)}
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-500 disabled:hover:bg-transparent"
            title={t('sidebar.newFolder')}
          >
            <FolderPlus size={16} />
          </button>
        </div>
      </div>

      <div
        className="px-3 py-2 border-b border-zinc-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <label htmlFor="explorer-search" className="sr-only">
          {t('sidebar.search')}
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
            disabled={rootFolders.length === 0}
            placeholder={
              rootFolders.length > 0
                ? t('sidebar.searchPlaceholder')
                : t('sidebar.openFolderToSearch')
            }
            className="w-full bg-white border border-zinc-200 rounded-md py-1.5 pl-8 pr-7 text-xs text-zinc-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400 disabled:opacity-60"
            aria-label={t('sidebar.search')}
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
              title={t('sidebar.clear')}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-2 relative"
        onClick={(e) => {
          if (e.currentTarget === e.target) {
            setSelectedPath(null);
          }
        }}
        onKeyDown={() => {}}
        role="presentation"
      >
        {/* 外部文件拖拽遮罩层 */}
        {(isDragOver || isExternalDragOver) && (
          <DragDropHint
            tone="sidebar"
            className="bg-zinc-50/85"
            label={
              rootFolders.length > 0
                ? t('fileDrop.addToWorkspace')
                : dragClassificationType === 'folders'
                  ? t('fileDrop.openWorkspace')
                  : t('fileDrop.openFile')
            }
          />
        )}

        {isSearchActive ? (
          <div>
            {searchMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-400 text-sm">
                <Search size={24} className="mb-2 opacity-20" />
                <span>{t('sidebar.noMatches')}</span>
                <span className="mt-1 text-xs text-zinc-400">
                  {t('sidebar.tryDifferent')}
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
                  // V6: 找到对应的根路径计算相对路径
                  let relativePath = node.path;
                  for (const folder of rootFolders) {
                    const prefix = folder.workspacePath.endsWith('/')
                      ? folder.workspacePath
                      : `${folder.workspacePath}/`;
                    if (node.path.startsWith(prefix)) {
                      relativePath = node.path.slice(prefix.length);
                      break;
                    }
                  }
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
                      <File size={16} className="text-zinc-500 flex-shrink-0" />
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
        ) : rootFolders.length === 0 && !ghostNode ? (
          renderEmptyState()
        ) : shouldUseVirtualization ? (
          // 虚拟滚动模式（节点数 > 100）
          <VirtualizedFileTree
            flattenedNodes={flattenedNodes}
            containerHeight={500}
            selectedPath={selectedPath}
            activeFile={activeFile}
            renamingPath={renamingPath}
            renameTrigger={renameTrigger}
            ghostNode={ghostNode}
            onToggleExpand={toggleNode}
            onSelect={setSelectedPath}
            onOpenContextMenu={openNodeContextMenu}
            onGhostCommit={commitCreate}
            onGhostCancel={cancelCreate}
            onRequestRenameStart={(path) => setRenamingPath(path)}
            onRequestRenameEnd={() => setRenamingPath(null)}
            onShowLevel2Error={showLevel2SidebarError}
            className="flex-1"
          />
        ) : (
          <div className="space-y-0.5">
            {/* V6: 渲染所有根文件夹 */}
            {rootFolders.map((rootFolder) =>
              renderRootFolderTree(rootFolder, 0),
            )}
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
  onShowLevel2Error,
  onRequestRenameStart,
  onRequestRenameEnd,
  onSelect,
  rootPath,
  dragState,
  dropState,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
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
  onShowLevel2Error: (
    error: unknown,
    source: string,
    reason: string,
    suggestion: string,
  ) => void;
  onRequestRenameStart: (path: string) => void;
  onRequestRenameEnd: () => void;
  onSelect: (path: string) => void;
  rootPath: string;
  dragState: DragState;
  dropState: DropState;
  onDragStart: (
    e: React.DragEvent,
    path: string,
    type: 'file' | 'directory',
    rootPath: string,
  ) => void;
  onDragEnd: () => void;
  onDragOver: (
    e: React.DragEvent,
    targetPath: string,
    isDirectory: boolean,
  ) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetPath: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(getDisplayName(node));
  const isDirectory = node.type === 'directory';
  const hasChildren = node.children && node.children.length > 0;
  const isFocused =
    selectedPath !== null &&
    normalizePath(selectedPath) === normalizePath(node.path);
  const isActiveFile =
    node.type === 'file' &&
    activeFile !== null &&
    normalizePath(activeFile) === normalizePath(node.path);
  const isActiveParent =
    isDirectory &&
    Boolean(activeFile) &&
    normalizePath(getParentPath(activeFile as string)) ===
      normalizePath(node.path);

  // 拖拽状态计算
  const isDraggingThis = dragState.dragPath === node.path;
  const isDropTarget = dropState.dropTargetPath === node.path;
  const dropPosition = isDropTarget ? dropState.dropPosition : null;

  useEffect(() => {
    if (
      renamingPath !== null &&
      normalizePath(renamingPath) === normalizePath(node.path)
    ) {
      setRenameDraft(getDisplayName(node));
      setIsRenaming(true);
    }
  }, [node, renamingPath, renameTrigger]);

  useEffect(() => {
    if (
      isDirectory &&
      ghostNode !== null &&
      ghostNode.parentPath !== null &&
      normalizePath(ghostNode.parentPath) === normalizePath(node.path) &&
      !isExpanded
    ) {
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
      onShowLevel2Error(
        error,
        'sidebar-rename',
        t('sidebar.renameFailed'),
        t('sidebar.renameRetrySuggestion'),
      );
      setRenameDraft(oldName);
    } finally {
      setIsRenaming(false);
      onRequestRenameEnd();
    }
  };

  // 拖拽事件处理
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, node.path, node.type, rootPath);
  };

  const handleDragOver = (e: React.DragEvent) => {
    onDragOver(e, node.path, isDirectory);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    onDragLeave(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    onDrop(e, node.path);
  };

  // 计算拖拽相关样式
  const getDragClasses = () => {
    const classes: string[] = [];

    if (isDraggingThis) {
      classes.push('opacity-50');
    }

    if (isDropTarget && dropPosition === 'inside') {
      classes.push('bg-blue-100 ring-2 ring-blue-400');
    }

    return classes.join(' ');
  };

  return (
    <div>
      {/* 上方放置指示线 */}
      {isDropTarget && dropPosition === 'above' && (
        <div
          className="h-0.5 bg-blue-500 mx-2 rounded-full"
          style={{ marginLeft: `${level * 12 + 8}px` }}
        />
      )}

      <div
        className={`group relative flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors duration-150 ease-in-out ${
          isDirectory
            ? isFocused
              ? 'bg-zinc-200 text-zinc-800'
              : 'text-zinc-500 hover:bg-zinc-200/40'
            : isActiveFile
              ? 'bg-blue-50/50 text-zinc-900'
              : isFocused
                ? 'bg-zinc-200 text-zinc-800'
                : 'text-zinc-700 hover:bg-zinc-200/50'
        } ${getDragClasses()}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
        onContextMenu={(event) => onOpenContextMenu(event, node)}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
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

      {/* 下方放置指示线 */}
      {isDropTarget && dropPosition === 'below' && (
        <div
          className="h-0.5 bg-blue-500 mx-2 rounded-full"
          style={{ marginLeft: `${level * 12 + 8}px` }}
        />
      )}

      {isDirectory && isExpanded && (
        <div>
          {ghostNode &&
            ghostNode.parentPath !== null &&
            normalizePath(ghostNode.parentPath) ===
              normalizePath(node.path) && (
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
                onShowLevel2Error={onShowLevel2Error}
                onRequestRenameStart={onRequestRenameStart}
                onRequestRenameEnd={onRequestRenameEnd}
                onSelect={onSelect}
                rootPath={rootPath}
                dragState={dragState}
                dropState={dropState}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            ))}
        </div>
      )}
    </div>
  );
}
