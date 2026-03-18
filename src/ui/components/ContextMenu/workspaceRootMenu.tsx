/**
 * Workspace Root Folder Context Menu Configuration
 *
 * Defines menu items for the workspace root folder header context menu.
 *
 * @see docs/current/PM/V5 功能清单.md - INT-010: 文件树右键菜单
 */

import { Pencil, FolderMinus, Folder, Copy } from 'lucide-react';
import type { MenuItem } from '../ContextMenu/contextMenuRegistry';
import { divider } from '../ContextMenu/contextMenuRegistry';
import { t } from '../../../shared/i18n';

export interface WorkspaceRootMenuContext {
  folderPath: string;
  displayName: string;
  onRename: () => void;
  onRemove: () => void;
  onRevealInFinder: () => void;
  onCopyPath: () => void;
}

/**
 * Get workspace root folder context menu items
 */
export function getWorkspaceRootMenuItems(
  context: WorkspaceRootMenuContext,
): MenuItem[] {
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const items: MenuItem[] = [
    {
      id: 'rename-display-name',
      label: t('workspace.renameDisplayName'),
      icon: <Pencil size={14} />,
      action: context.onRename,
    },
    {
      id: 'remove-from-workspace',
      label: t('workspace.removeFromWorkspace'),
      icon: <FolderMinus size={14} />,
      action: context.onRemove,
    },
    divider(),
    {
      id: 'reveal-in-finder',
      label: isMac
        ? t('contextMenu.revealInFinder')
        : t('contextMenu.revealInExplorer'),
      icon: <Folder size={14} />,
      action: context.onRevealInFinder,
    },
    {
      id: 'copy-path',
      label: t('contextMenu.copyPath'),
      icon: <Copy size={14} />,
      action: context.onCopyPath,
    },
  ];

  return items;
}

