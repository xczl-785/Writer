/**
 * useCreateEntry — 新建文件/文件夹的交互编排 hook
 *
 * 管理 ghostNode 状态、目标解析、展开目录、提交创建等逻辑，
 * 让 Sidebar 只负责事件绑定与渲染。
 */

import { useState, useCallback } from 'react';
import { resolveCreateGhostTarget } from '../../domains/workspace/services/createEntryTarget';
import { FsService } from '../../domains/file/services/FsService';
import { openFile } from '../../domains/workspace/services/WorkspaceManager';
import { useStatusStore } from '../../state/slices/statusSlice';
import { ensureMarkdownExtension, hasInvalidNodeName } from './pathing';
import { joinPath } from '../../utils/pathUtils';
import { t } from '../../shared/i18n';
import { showLevel2Notification } from '../../services/error/level2Notification';
import { getSidebarErrorMeta } from './sidebarErrorCatalog';
import type { InlineCommitTrigger } from './InlineInput';
import type { FileNode } from '../../state/types';

export type GhostNode = {
  parentPath: string | null;
  type: 'file' | 'directory';
  rootPath: string;
};

export interface UseCreateEntryDeps {
  getRootPathForPath: (path: string | null) => string | null;
  currentPath: string | null;
  selectedPath: string | null;
  selectedNodeType: FileNode['type'] | null;
  activeFile: string | null;
  expandNode: (path: string) => void;
  setNodes: (rootPath: string, nodes: FileNode[]) => void;
  setSelectedPath: (path: string) => void;
}

export function useCreateEntry(deps: UseCreateEntryDeps) {
  const {
    getRootPathForPath,
    currentPath,
    selectedPath,
    selectedNodeType,
    activeFile,
    expandNode,
    setNodes,
    setSelectedPath,
  } = deps;

  const [ghostNode, setGhostNode] = useState<GhostNode | null>(null);

  const beginCreateWithGhost = useCallback(
    (ghost: GhostNode) => {
      const previewDirectoryPath = ghost.parentPath ?? ghost.rootPath;
      expandNode(previewDirectoryPath);
      setGhostNode(ghost);
    },
    [expandNode],
  );

  const cancelCreate = useCallback(() => {
    setGhostNode(null);
  }, []);

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

  const startCreate = useCallback(
    (type: 'file' | 'directory') => {
      const targetRootPath = getRootPathForPath(selectedPath) || currentPath;
      if (!targetRootPath) {
        return;
      }

      beginCreateWithGhost(
        resolveCreateGhostTarget({
          type,
          rootPath: targetRootPath,
          targetPath: selectedPath,
          targetType: selectedNodeType,
          activeFile,
        }),
      );
    },
    [
      getRootPathForPath,
      selectedPath,
      currentPath,
      selectedNodeType,
      activeFile,
      beginCreateWithGhost,
    ],
  );

  const commitCreate = useCallback(
    async (nameRaw: string, trigger: InlineCommitTrigger): Promise<void> => {
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
          useStatusStore
            .getState()
            .setStatus('error', t('sidebar.invalidName'));
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

        const refreshedNodes = await FsService.listTree(targetRootPath);
        setNodes(targetRootPath, refreshedNodes);
        setSelectedPath(fullPath);

        if (ghostNode.type === 'file') {
          await openFile(fullPath);
        }

        cancelCreate();
      } catch (error) {
        const createError = getSidebarErrorMeta('create');
        cancelCreate();
        showLevel2Notification({
          error,
          source: createError.source,
          reason: createError.reason,
          suggestion: createError.suggestion,
          dedupeKey: createError.source,
        });
      }
    },
    [ghostNode, cancelCreate, setNodes, setSelectedPath],
  );

  return {
    ghostNode,
    startCreate,
    beginCreateWithGhost,
    getCreateGhostTarget,
    commitCreate,
    cancelCreate,
  };
}
