// src/domains/file/utils/ghostPathUtils.ts
// V6.1 单文件拖拽 - Ghost Node 路径获取工具函数

import type { RootFolderNode } from '../state/fileStore';
import { getParentPath } from '../../../utils/pathUtils';

export interface GetDropTargetOptions {
  /** 当前选中的文件/目录路径 */
  selectedPath: string | null;
  /** 根文件夹列表 */
  rootFolders: RootFolderNode[];
}

/**
 * 获取拖拽目标目录
 *
 * 复用 Ghost Node 逻辑，但解耦为纯函数以便服务层使用
 *
 * @param options - 选项
 * @param options.selectedPath - 当前选中的文件/目录路径
 * @param options.rootFolders - 根文件夹列表
 * @returns 目标目录路径，空字符串表示无有效目标
 */
export function getDropTargetDirectory({
  selectedPath,
  rootFolders,
}: GetDropTargetOptions): string {
  // 无工作区或无根目录
  if (rootFolders.length === 0) {
    return '';
  }

  // 有选中项
  if (selectedPath) {
    // 判断选中项是文件还是目录（以 / 结尾为目录）
    const isDirectory = selectedPath.endsWith('/');

    if (isDirectory) {
      // 选中文件夹 → 目标 = 选中路径
      return selectedPath;
    } else {
      // 选中文件 → 目标 = 父目录
      return getParentPath(selectedPath);
    }
  }

  // 无选中 → 目标 = 第一个根目录
  return rootFolders[0].workspacePath;
}

/**
 * 判断选中项类型
 *
 * @param selectedPath - 选中的路径
 * @returns 'directory' | 'file' | null
 */
export function getSelectedPathKind(
  selectedPath: string | null,
): 'directory' | 'file' | null {
  if (!selectedPath) {
    return null;
  }
  return selectedPath.endsWith('/') ? 'directory' : 'file';
}

/**
 * 查找目标目录所属的根路径
 *
 * @param targetDir - 目标目录路径
 * @param rootFolders - 根文件夹列表
 * @returns 根路径，null 表示未找到
 */
export function findRootPath(
  targetDir: string,
  rootFolders: RootFolderNode[],
): string | null {
  // 移除尾部斜杠
  const normalizedTarget = targetDir.replace(/\/$/, '');

  // 按路径深度降序排序，优先匹配最深的根目录（避免 /workspace 匹配 /workspace-backup）
  const sorted = [...rootFolders].sort(
    (a, b) => b.workspacePath.length - a.workspacePath.length,
  );

  for (const root of sorted) {
    const normalizedRoot = root.workspacePath.replace(/\/$/, '');
    // 精确匹配：/workspace/docs 匹配 /workspace，但不匹配 /workspace-a
    if (
      normalizedTarget === normalizedRoot ||
      normalizedTarget.startsWith(normalizedRoot + '/')
    ) {
      return normalizedRoot;
    }
  }

  return null;
}
