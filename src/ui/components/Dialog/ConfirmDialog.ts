/**
 * Confirm Dialog Component
 *
 * A reusable confirmation dialog component following V5 UI/UX specification.
 * Uses Tauri native dialog for file operations.
 *
 * @see docs/current/UI/UI_UX规范.md - 3.4 破坏性操作与容错
 * @see docs/current/PM/V5 功能清单.md - INT-013: 删除确认对话框
 */

import { ask } from '@tauri-apps/plugin-dialog';

export interface ConfirmDialogOptions {
  /** Dialog title */
  title: string;
  /** Main message */
  message: string;
  /** Detailed description (optional) */
  description?: string;
  /** OK button label */
  okLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Whether this is a dangerous action */
  kind?: 'warning' | 'error' | 'info';
}

/**
 * Show a native confirmation dialog using Tauri
 *
 * @param options Dialog options
 * @returns Promise resolving to true if confirmed, false otherwise
 */
export async function showConfirmDialog(
  options: ConfirmDialogOptions,
): Promise<boolean> {
  const {
    title,
    message,
    description,
    okLabel = 'OK',
    cancelLabel = 'Cancel',
    kind = 'info',
  } = options;

  const fullMessage = description ? `${message}\n\n${description}` : message;

  try {
    const confirmed = await ask(fullMessage, {
      title,
      kind,
      okLabel,
      cancelLabel,
    });

    return confirmed;
  } catch (error) {
    console.error('Failed to show native dialog:', error);
    // Fallback to browser confirm if Tauri dialog fails
    return window.confirm(`${title}\n\n${fullMessage}`);
  }
}

/**
 * Show a delete confirmation dialog
 *
 * @param itemName Name of the item to delete
 * @param isDirectory Whether the item is a directory
 * @returns Promise resolving to true if confirmed
 */
export async function showDeleteConfirmDialog(
  itemName: string,
  isDirectory: boolean,
): Promise<boolean> {
  const message = `确定要将 "${itemName}"${
    isDirectory ? ' 及其所有内容' : ''
  }移至废纸篓吗？`;

  return showConfirmDialog({
    title: '移至废纸篓',
    message,
    kind: 'warning',
    okLabel: '移至废纸篓',
    cancelLabel: '取消',
  });
}
