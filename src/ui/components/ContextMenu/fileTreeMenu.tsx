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
import { t } from '../../../shared/i18n';

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
    ...(context.node.type === 'directory'
      ? [
          {
            id: 'new-file',
            label: t('contextMenu.newFile'),
            shortcut: 'Cmd+N',
            icon: <FilePlus size={14} />,
            action: context.onNewFile,
          },
          {
            id: 'new-folder',
            label: t('contextMenu.newFolder'),
            shortcut: 'Shift+Cmd+N',
            icon: <FolderPlus size={14} />,
            action: context.onNewFolder,
          },
          divider(),
        ]
      : []),
    {
      id: 'rename',
      label: t('contextMenu.rename'),
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
      label: t('contextMenu.copyPath'),
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
    revealLabel: isMac
      ? t('contextMenu.revealInFinder')
      : t('contextMenu.revealInExplorer'),
    trashLabel: isMac
      ? t('contextMenu.moveToTrash')
      : t('contextMenu.moveToRecycleBin'),
  };
}
