/**
 * VirtualizedFileTree - 虚拟滚动文件树组件
 * 使用 react-window List 实现高性能渲染
 * 当文件树节点数量超过 100 时启用
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { List } from 'react-window';
import type { FileNode } from '../../../state/types';
import type { FlattenedNode } from './types';
import { getItemSize } from './flattenTree';
import { workspaceActions } from '../../../state/actions/workspaceActions';
import { FsSafety } from '../../../services/fs/FsSafety';
import { fileActions } from '../../../state/actions/fileActions';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { joinPath } from '../../../utils/pathUtils';
import { ChevronDown, ChevronRight, File } from 'lucide-react';
import { t } from '../../../i18n';
import {
  getDisplayName,
  getFileExtension,
  getParentPath,
  hasInvalidNodeName,
} from '../../sidebar/pathing';
import {
  InlineInput,
  type InlineCommitTrigger,
} from '../../sidebar/InlineInput';

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

// Ghost 节点类型
type GhostNodeType = {
  parentPath: string | null;
  type: 'file' | 'directory';
  rootPath: string;
} | null;

// Row props 类型（不包含 index 和 style）
interface RowProps {
  flattenedNodes: FlattenedNode[];
  selectedPath: string | null;
  activeFile: string | null;
  renamingPath: string | null;
  renameTrigger: number;
  ghostNode: GhostNodeType;
  onToggleExpand: (path: string) => void;
  onSelect: (path: string) => void;
  onOpenContextMenu: (
    event: React.MouseEvent,
    node: FileNode,
    rootPath: string,
  ) => void;
  onGhostCommit: (name: string, trigger: InlineCommitTrigger) => Promise<void>;
  onGhostCancel: () => void;
  onRequestRenameEnd: () => void;
}

// List API 类型
interface ListImperativeAPI {
  readonly element: HTMLDivElement | null;
  scrollToRow(config: {
    index: number;
    align?: 'auto' | 'center' | 'end' | 'smart' | 'start';
  }): void;
}

/**
 * 虚拟列表中的单行渲染组件
 * 注意：不要使用 memo 包装，否则类型不兼容
 */
function TreeNodeRow({
  index,
  style,
  ariaAttributes,
  flattenedNodes,
  selectedPath,
  activeFile,
  renamingPath,
  ghostNode,
  onToggleExpand,
  onSelect,
  onOpenContextMenu,
  onGhostCommit,
  onGhostCancel,
  onRequestRenameEnd,
}: {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
} & RowProps): React.ReactElement | null {
  // 所有 hooks 必须在条件返回之前调用
  const [renameDraft, setRenameDraft] = useState('');
  const prevNodePathRef = useRef('');

  const item = flattenedNodes[index];

  // 使用 useEffect 更新状态
  useEffect(() => {
    if (item) {
      const displayName = getDisplayName(item.node);
      if (prevNodePathRef.current !== item.node.path) {
        setRenameDraft(displayName);
        prevNodePathRef.current = item.node.path;
      }
    }
  }, [item]);

  // 在 hooks 之后进行条件返回
  if (!item) return null;

  const { node, depth, rootPath, isExpanded } = item;
  const isDirectory = node.type === 'directory';
  const isFocused = selectedPath === node.path;
  const isActiveFile = node.type === 'file' && activeFile === node.path;
  const isActiveParent =
    isDirectory &&
    Boolean(activeFile) &&
    getParentPath(activeFile as string) === node.path;
  const isRenaming = renamingPath === node.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);

    if (isRenaming) return;

    if (isDirectory) {
      onToggleExpand(node.path);
    } else {
      workspaceActions.openFile(node.path).catch(console.error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e as unknown as React.MouseEvent);
    }
  };

  const commitRename = async (
    nameRaw: string,
    trigger: InlineCommitTrigger,
  ): Promise<void> => {
    const oldName = getDisplayName(node);
    const newName = nameRaw.trim();

    if (!newName || newName === oldName) {
      onRequestRenameEnd();
      return;
    }

    if (hasInvalidNodeName(newName)) {
      if (trigger === 'enter') {
        useStatusStore.getState().setStatus('error', t('sidebar.invalidName'));
      }
      setRenameDraft(oldName);
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
      onRequestRenameEnd();
      return;
    }

    const nodeParentPath = getParentPath(node.path);
    const newFileName =
      node.type === 'file'
        ? `${newName}${getFileExtension(node.name) || '.md'}`
        : newName;
    const newPath = nodeParentPath
      ? joinPath(nodeParentPath, newFileName)
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
      onRequestRenameEnd();
    }
  };

  return (
    <div style={style} {...ariaAttributes}>
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
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={(event) => onOpenContextMenu(event, node, rootPath)}
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

      {/* Ghost 节点 - 在展开的目录后显示 */}
      {ghostNode && ghostNode.parentPath === node.path && isExpanded && (
        <GhostRow
          level={depth + 1}
          type={ghostNode.type}
          onCommit={onGhostCommit}
          onCancel={onGhostCancel}
        />
      )}
    </div>
  );
}

/**
 * Ghost 节点行（新建文件/文件夹时显示）
 */
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

interface VirtualizedFileTreeProps {
  flattenedNodes: FlattenedNode[];
  containerHeight: number;
  selectedPath: string | null;
  activeFile: string | null;
  renamingPath: string | null;
  renameTrigger: number;
  ghostNode: GhostNodeType;
  onToggleExpand: (path: string) => void;
  onSelect: (path: string) => void;
  onOpenContextMenu: (
    event: React.MouseEvent,
    node: FileNode,
    rootPath: string,
  ) => void;
  onGhostCommit: (name: string, trigger: InlineCommitTrigger) => Promise<void>;
  onGhostCancel: () => void;
  onRequestRenameStart: (path: string) => void;
  onRequestRenameEnd: () => void;
  className?: string;
}

/**
 * 虚拟滚动文件树主组件
 */
export function VirtualizedFileTree({
  flattenedNodes,
  containerHeight,
  selectedPath,
  activeFile,
  renamingPath,
  renameTrigger,
  ghostNode,
  onToggleExpand,
  onSelect,
  onOpenContextMenu,
  onGhostCommit,
  onGhostCancel,
  onRequestRenameEnd,
  className = '',
}: VirtualizedFileTreeProps): React.ReactElement {
  const listRef = useRef<ListImperativeAPI>(null);

  // 计算行高
  const rowHeight = useCallback(
    (index: number): number => getItemSize(flattenedNodes, ghostNode)(index),
    [flattenedNodes, ghostNode],
  );

  // 传递给行的数据
  const rowProps: RowProps = {
    flattenedNodes,
    selectedPath,
    activeFile,
    renamingPath,
    renameTrigger,
    ghostNode,
    onToggleExpand,
    onSelect,
    onOpenContextMenu,
    onGhostCommit,
    onGhostCancel,
    onRequestRenameEnd,
  };

  // 滚动到选中项
  useEffect(() => {
    if (selectedPath && listRef.current) {
      const index = flattenedNodes.findIndex(
        (item) => item.id === selectedPath,
      );
      if (index >= 0) {
        listRef.current.scrollToRow({ index, align: 'smart' });
      }
    }
  }, [selectedPath, flattenedNodes]);

  if (flattenedNodes.length === 0) {
    return <div className={className}>No files</div>;
  }

  const hasRootGhostNode = ghostNode && ghostNode.parentPath === null;
  const adjustedHeight = containerHeight - (hasRootGhostNode ? 32 : 0);

  return (
    <div className={className}>
      {/* 根级别的 ghost 节点 */}
      {hasRootGhostNode && (
        <GhostRow
          level={0}
          type={ghostNode.type}
          onCommit={onGhostCommit}
          onCancel={onGhostCancel}
        />
      )}

      <List
        listRef={listRef}
        rowComponent={TreeNodeRow}
        rowProps={rowProps}
        rowCount={flattenedNodes.length}
        rowHeight={rowHeight}
        style={{ height: adjustedHeight }}
        overscanCount={5}
      />
    </div>
  );
}

export default VirtualizedFileTree;
