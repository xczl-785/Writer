// src/ui/components/Dialog/WorkspaceLockDialog.ts
// V6 工作区锁对话框 - 显示工作区已在其他窗口打开的提示

import { t } from '../../../shared/i18n';
import type { WorkspaceLockStatus } from '../../../domains/workspace/services/WorkspaceLockService';

export interface WorkspaceLockDialogOptions {
  /** 工作区路径 */
  workspacePath: string;
  /** 锁状态 */
  lockStatus: WorkspaceLockStatus;
}

export interface WorkspaceLockDialogResult {
  /** 用户选择：强制打开 */
  openAnyway: boolean;
}

/**
 * 显示工作区锁对话框
 *
 * @param options 锁对话框选项
 * @returns 用户选择
 */
export async function showWorkspaceLockDialog(
  options: WorkspaceLockDialogOptions,
): Promise<WorkspaceLockDialogResult> {
  const { lockStatus } = options;

  if (typeof document === 'undefined') {
    // SSR fallback
    const confirmed = window.confirm(
      `${t('workspaceLock.message')}\n\n${t('workspaceLock.description')}`,
    );
    return { openAnyway: confirmed };
  }

  return new Promise<WorkspaceLockDialogResult>((resolve) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4';

    const panel = document.createElement('div');
    panel.className =
      'w-full max-w-md rounded-xl border border-amber-200 bg-white p-5 shadow-2xl transition-all duration-150 ease-out';
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', t('workspaceLock.title'));

    // 标题
    const titleElement = document.createElement('h3');
    titleElement.className =
      'text-base font-semibold text-amber-900 flex items-center gap-2';
    titleElement.innerHTML = `
      <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      ${t('workspaceLock.title')}
    `;

    // 消息
    const messageElement = document.createElement('p');
    messageElement.className = 'mt-3 text-sm text-zinc-700';
    messageElement.textContent = t('workspaceLock.message');

    // 描述
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'mt-2 text-sm text-zinc-600';
    descriptionElement.textContent = t('workspaceLock.description');

    // 锁定信息
    if (lockStatus.lockedBy || lockStatus.lockedAt) {
      const lockInfoElement = document.createElement('div');
      lockInfoElement.className =
        'mt-3 p-2 bg-zinc-50 rounded text-xs text-zinc-500';

      const lockTime = lockStatus.lockedAt
        ? new Date(lockStatus.lockedAt).toLocaleString()
        : 'Unknown';

      lockInfoElement.innerHTML = `
        <div class="flex justify-between">
          <span>Process ID:</span>
          <span class="font-mono">${lockStatus.lockedBy || 'Unknown'}</span>
        </div>
        <div class="flex justify-between mt-1">
          <span>Locked at:</span>
          <span class="font-mono">${lockTime}</span>
        </div>
      `;

      panel.append(
        titleElement,
        messageElement,
        descriptionElement,
        lockInfoElement,
      );
    } else {
      panel.append(titleElement, messageElement, descriptionElement);
    }

    // 按钮区域
    const actions = document.createElement('div');
    actions.className = 'mt-5 flex items-center justify-end gap-2';

    // 取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className =
      'rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300';
    cancelButton.textContent = t('workspaceLock.cancel');

    // 强制打开按钮
    const openAnywayButton = document.createElement('button');
    openAnywayButton.type = 'button';
    openAnywayButton.className =
      'rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300';
    openAnywayButton.textContent = t('workspaceLock.openAnyway');

    actions.append(cancelButton, openAnywayButton);
    panel.append(actions);
    overlay.append(panel);

    let settled = false;
    const focusable = [cancelButton, openAnywayButton];

    const cleanup = () => {
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.removeEventListener('click', onOverlayClick);
      cancelButton.removeEventListener('click', onCancel);
      openAnywayButton.removeEventListener('click', onOpenAnyway);
      overlay.remove();
    };

    const close = (openAnyway: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ openAnyway });
    };

    const onCancel = () => close(false);
    const onOpenAnyway = () => close(true);

    const onOverlayClick = (event: MouseEvent) => {
      if (event.target === overlay) {
        close(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
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
    openAnywayButton.addEventListener('click', onOpenAnyway);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeyDown, true);
    document.body.appendChild(overlay);

    // 默认聚焦到取消按钮（更安全的选择）
    requestAnimationFrame(() => {
      cancelButton.focus();
    });
  });
}

export default showWorkspaceLockDialog;
