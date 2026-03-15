// src/domains/file/utils/fileTypeUtils.ts
// V6.1 单文件拖拽 - 文件类型检查工具（策略模式）

import { getFileExtension } from '../../../utils/pathUtils';

/**
 * 文件类型策略接口
 */
export interface FileTypePolicy {
  /** 策略名称 */
  name: string;
  /** 检查文件是否支持 */
  isSupported: (path: string) => boolean;
  /** 获取支持的扩展名列表 */
  getExtensions: () => string[];
  /** 获取不支持的提示信息 */
  getUnsupportedMessage: (path: string) => string;
}

/**
 * Markdown 文件策略（V6.1）
 */
export const MARKDOWN_POLICY: FileTypePolicy = {
  name: 'Markdown',
  isSupported: (path) => {
    const ext = getFileExtension(path).toLowerCase();
    return ['.md', '.markdown', '.mdx'].includes(ext);
  },
  getExtensions: () => ['.md', '.markdown', '.mdx'],
  getUnsupportedMessage: (path) => {
    const fileName = path.split('/').pop() || path;
    return `"${fileName}" 不是支持的 Markdown 文件类型`;
  },
};

/**
 * 检查文件是否支持
 *
 * @param path - 文件路径
 * @param policy - 策略（默认 Markdown）
 */
export function isSupportedFile(
  path: string,
  policy: FileTypePolicy = MARKDOWN_POLICY,
): boolean {
  return policy.isSupported(path);
}

/**
 * 获取文件类型检查错误提示
 *
 * @param path - 文件路径
 * @param policy - 策略（默认 Markdown）
 */
export function getUnsupportedMessage(
  path: string,
  policy: FileTypePolicy = MARKDOWN_POLICY,
): string {
  return policy.getUnsupportedMessage(path);
}

/**
 * 获取策略支持的扩展名列表（用于文件对话框 filter）
 *
 * @param policy - 策略（默认 Markdown）
 */
export function getSupportedExtensions(
  policy: FileTypePolicy = MARKDOWN_POLICY,
): string[] {
  return policy.getExtensions();
}
