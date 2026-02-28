/**
 * File Tree Context Menu Configuration
 *
 * Defines menu items for the file tree context menu.
 *
 * @see docs/current/PM/V5 功能清单.md - INT-010: 文件树右键菜单
 */

import {
  FilePlus,
  FolderPlus,
  Pencil,
  Folder,
  Copy,
  Trash2,
} from 'lucide-react';
import type { MenuItem } from '../ContextMenu/contextMenuRegistry';
import { divider } from '../ContextMenu/contextMenuRegistry';
import type { FileNode } from '../../../state/types';

export interface FileTreeMenuContext {
  node: FileNode;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onRevealInFinder: () => void;
  onCopyPath: () => void;
  onDelete: () => void;
  isReservedPath?: boolean;
}

/**
 * Get file tree context menu items
 */
export function getFileTreeMenuItems(context: FileTreeMenuContext): MenuItem[] {
  const { isReservedPath } = context;
  const labels = getPlatformLabels();

  const items: MenuItem[] = [
    {
      id: 'new-file',
      label: 'New File',
      shortcut: 'Cmd+N',
      icon: <FilePlus size={14} />,
      action: context.onNewFile,
    },
    {
      id: 'new-folder',
      label: 'New Folder',
      shortcut: 'Shift+Cmd+N',
      icon: <FolderPlus size={14} />,
      action: context.onNewFolder,
    },
    divider(),
    {
      id: 'rename',
      label: 'Rename',
      shortcut: 'Enter',
      icon: <Pencil size={14} />,
      action: context.onRename,
      disabled: isReservedPath ? () => true : undefined,
    },
    {
      id: 'reveal-in-finder',
      label: labels.revealLabel,
      icon: <Folder size={14} />,
      action: context.onRevealInFinder,
    },
    {
      id: 'copy-path',
      label: 'Copy Path',
      icon: <Copy size={14} />,
      action: context.onCopyPath,
    },
    divider(),
    {
      id: 'delete',
      label: labels.trashLabel,
      shortcut: 'Cmd+Backspace',
      icon: <Trash2 size={14} />,
      danger: true,
      action: context.onDelete,
      disabled: isReservedPath ? () => true : undefined,
    },
  ];

  return items;
}

/**
 * Platform-specific labels
 */
export function getPlatformLabels(): {
  revealLabel: string;
  trashLabel: string;
} {
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return {
    revealLabel: isMac ? 'Reveal in Finder' : 'Show in Explorer',
    trashLabel: isMac ? 'Move to Trash' : 'Move to Recycle Bin',
  };
}
