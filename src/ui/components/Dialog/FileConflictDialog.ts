// src/ui/components/Dialog/FileConflictDialog.ts
// V6 文件冲突对话框 - 用于处理文件保存冲突

import { t } from '../../../i18n';
import type {
  FileConflictInfo,
  FileConflictResolution,
} from '../../../types/WorkspaceErrors';

export interface FileConflictDialogOptions extends FileConflictInfo {
  /** 显示差异按钮的回调 */
  onShowDiff?: () => void;
}

/**
 * 显示文件冲突对话框
 *
 * @param options 冲突信息
 * @returns 用户选择的解决方案
 */
export async function showFileConflictDialog(
  options: FileConflictDialogOptions,
): Promise<FileConflictResolution> {
  const { fileName, conflictType, onShowDiff } = options;

  if (typeof document === 'undefined') {
    // SSR fallback
    const confirmed = window.confirm(
      t('fileConflict.message').replace('{name}', fileName),
    );
    return confirmed ? 'overwrite' : 'cancel';
  }

  return new Promise<FileConflictResolution>((resolve) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4';

    const panel = document.createElement('div');
    panel.className =
      'w-full max-w-md rounded-xl border border-amber-200 bg-white p-5 shadow-2xl transition-all duration-150 ease-out';
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', t('fileConflict.title'));

    // 标题
    const titleElement = document.createElement('h3');
    titleElement.className =
      'text-base font-semibold text-amber-900 flex items-center gap-2';
    titleElement.innerHTML = `
      <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      ${t('fileConflict.title')}
    `;

    // 消息
    const messageElement = document.createElement('p');
    messageElement.className = 'mt-3 text-sm text-zinc-700';
    messageElement.textContent = t('fileConflict.message').replace(
      '{name}',
      fileName,
    );

    // 冲突类型描述
    const conflictDescElement = document.createElement('p');
    conflictDescElement.className = 'mt-1 text-xs text-zinc-500';
    const conflictText = getConflictDescription(conflictType);
    conflictDescElement.textContent = conflictText;

    // 描述
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'mt-3 text-sm text-zinc-600';
    descriptionElement.textContent = t('fileConflict.description');

    // 按钮区域
    const actions = document.createElement('div');
    actions.className = 'mt-5 flex flex-col gap-2';

    // 按钮容器（主操作）
    const primaryActions = document.createElement('div');
    primaryActions.className = 'flex items-center justify-end gap-2';

    // 取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className =
      'rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300';
    cancelButton.textContent = t('fileConflict.cancel');

    // 保留本地按钮
    const keepLocalButton = document.createElement('button');
    keepLocalButton.type = 'button';
    keepLocalButton.className =
      'rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300';
    keepLocalButton.textContent = t('fileConflict.keepLocal');

    // 覆盖按钮
    const overwriteButton = document.createElement('button');
    overwriteButton.type = 'button';
    overwriteButton.className =
      'rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300';
    overwriteButton.textContent = t('fileConflict.overwrite');

    // 查看差异按钮（可选）
    const diffButton = onShowDiff ? document.createElement('button') : null;
    if (diffButton) {
      diffButton.type = 'button';
      diffButton.className =
        'w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300';
      diffButton.textContent = t('fileConflict.showDiff');
    }

    primaryActions.append(cancelButton, keepLocalButton, overwriteButton);
    actions.append(primaryActions);
    if (diffButton) {
      actions.append(diffButton);
    }

    panel.append(
      titleElement,
      messageElement,
      conflictDescElement,
      descriptionElement,
    );
    panel.append(actions);
    overlay.append(panel);

    let settled = false;
    const focusable = [cancelButton, keepLocalButton, overwriteButton];

    const cleanup = () => {
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.removeEventListener('click', onOverlayClick);
      cancelButton.removeEventListener('click', onCancel);
      keepLocalButton.removeEventListener('click', onKeepLocal);
      overwriteButton.removeEventListener('click', onOverwrite);
      diffButton?.removeEventListener('click', onShowDiffClick);
      overlay.remove();
    };

    const close = (resolution: FileConflictResolution) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(resolution);
    };

    const onCancel = () => close('cancel');
    const onKeepLocal = () => close('keep-local');
    const onOverwrite = () => close('overwrite');
    const onShowDiffClick = () => {
      if (onShowDiff) {
        onShowDiff();
      }
    };

    const onOverlayClick = (event: MouseEvent) => {
      if (event.target === overlay) {
        close('cancel');
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close('cancel');
        return;
      }

      if (event.key === 'Tab') {
        const currentIndex = focusable.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const nextIndex = event.shiftKey
          ? (currentIndex + focusable.length - 1) % focusable.length
          : (currentIndex + 1) % focusable.length;
        event.preventDefault();
        focusable[nextIndex].focus();
      }
    };

    cancelButton.addEventListener('click', onCancel);
    keepLocalButton.addEventListener('click', onKeepLocal);
    overwriteButton.addEventListener('click', onOverwrite);
    diffButton?.addEventListener('click', onShowDiffClick);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeyDown, true);
    document.body.appendChild(overlay);

    // 默认聚焦到保留本地按钮（更安全的选择）
    requestAnimationFrame(() => {
      keepLocalButton.focus();
    });
  });
}

/**
 * 获取冲突类型描述
 */
function getConflictDescription(conflictType: string): string {
  switch (conflictType) {
    case 'remote-modified':
      return 'The file has been modified by another process or application.';
    case 'remote-deleted':
      return 'The file has been deleted from disk.';
    case 'local-modified':
      return 'You have unsaved local changes.';
    default:
      return 'A conflict has been detected.';
  }
}

export default showFileConflictDialog;
