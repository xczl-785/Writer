import type { FileNode } from '../../state/types';

type NodeType = FileNode['type'] | null;

export interface ResolveCreateBasePathInput {
  currentPath: string;
  selectedPath: string | null;
  selectedType: NodeType;
  activeFile: string | null;
}

export const getParentPath = (path: string): string => {
  const lastSlashIndex = path.lastIndexOf('/');
  if (lastSlashIndex <= 0) {
    return '';
  }
  return path.substring(0, lastSlashIndex);
};

export const resolveCreateBasePath = ({
  currentPath,
  selectedPath,
  selectedType,
  activeFile,
}: ResolveCreateBasePathInput): string => {
  if (selectedPath) {
    if (selectedType === 'directory') {
      return selectedPath;
    }
    if (selectedType === 'file') {
      return getParentPath(selectedPath) || currentPath;
    }
  }

  if (activeFile) {
    return getParentPath(activeFile) || currentPath;
  }

  return currentPath;
};

export const hasInvalidNodeName = (name: string): boolean => {
  const trimmed = name.trim();
  if (!trimmed) {
    return true;
  }

  return trimmed.includes('/') || trimmed.includes('\\');
};

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdx'];

export const getFileExtension = (fileName: string): string => {
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0 || idx === fileName.length - 1) {
    return '';
  }
  return fileName.slice(idx);
};

export const isMarkdownFile = (fileName: string): boolean => {
  const ext = getFileExtension(fileName).toLowerCase();
  return MARKDOWN_EXTENSIONS.includes(ext);
};

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

    const children = node.children ? filterVisibleNodes(node.children) : [];
    if (children.length > 0) {
      filtered.push({ ...node, children });
    }
  }
  return filtered;
};
