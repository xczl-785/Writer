import type { FileNode } from '../../state/types';
import {
  getParentPath as getParentPathBase,
  getFileExtension as getFileExtensionBase,
  isMarkdownFile as isMarkdownFileBase,
  normalizePath,
} from '../../shared/utils/pathUtils';
export { resolveCreateBasePath } from '../../domains/workspace/services/createEntryTarget';

export const getParentPath = getParentPathBase;

export const hasInvalidNodeName = (name: string): boolean => {
  const trimmed = name.trim();
  if (!trimmed) {
    return true;
  }

  return trimmed.includes('/') || trimmed.includes('\\');
};

export const getFileExtension = getFileExtensionBase;
export const isMarkdownFile = isMarkdownFileBase;

export const getDisplayName = (node: FileNode): string => {
  if (node.type === 'directory') {
    return node.name;
  }
  const ext = getFileExtension(node.name);
  if (!ext) {
    return node.name;
  }
  return node.name.slice(0, -ext.length);
};

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdx'];

export const ensureMarkdownExtension = (baseName: string): string => {
  const trimmed = baseName.trim();
  if (!trimmed) {
    return trimmed;
  }
  const ext = getFileExtension(trimmed).toLowerCase();
  if (MARKDOWN_EXTENSIONS.includes(ext)) {
    return trimmed;
  }
  return `${trimmed}.md`;
};

export const filterVisibleNodes = (nodes: FileNode[]): FileNode[] => {
  const filtered: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      if (isMarkdownFile(node.name)) {
        filtered.push(node);
      }
      continue;
    }

    const lowerName = node.name.toLowerCase();
    if (lowerName === 'assets' || lowerName === '.assets') {
      continue;
    }

    const children = node.children ? filterVisibleNodes(node.children) : [];
    filtered.push({ ...node, children });
  }
  return filtered;
};

export const findNodeByPath = (
  nodes: FileNode[],
  path: string,
): FileNode | null => {
  const normalizedPath = normalizePath(path);
  for (const node of nodes) {
    if (normalizePath(node.path) === normalizedPath) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const childMatch = findNodeByPath(node.children, path);
      if (childMatch) {
        return childMatch;
      }
    }
  }
  return null;
};

export const flattenFileNodes = (nodes: FileNode[]): FileNode[] => {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      files.push(node);
      continue;
    }
    if (node.children && node.children.length > 0) {
      files.push(...flattenFileNodes(node.children));
    }
  }
  return files;
};
