/**
 * Confirm Dialog Component
 *
 * A reusable custom Web dialog following V5 UI/UX specification.
 * This implementation guarantees safe default focus behavior for destructive actions.
 */

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

  if (typeof document === 'undefined') {
    const fullMessage = description ? `${message}\n\n${description}` : message;
    return window.confirm(`${title}\n\n${fullMessage}`);
  }

  return new Promise<boolean>((resolve) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4';

    const panel = document.createElement('div');
    panel.className =
      'w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl transition-all duration-150 ease-out';
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', title);

    const titleElement = document.createElement('h3');
    titleElement.className = 'text-base font-semibold text-zinc-900';
    titleElement.textContent = title;

    const messageElement = document.createElement('p');
    messageElement.className = 'mt-2 text-sm text-zinc-700';
    messageElement.textContent = message;

    const descriptionElement = description
      ? document.createElement('p')
      : null;
    if (descriptionElement) {
      descriptionElement.className = 'mt-1 text-sm text-zinc-500';
      descriptionElement.textContent = description ?? null;
    }

    const actions = document.createElement('div');
    actions.className = 'mt-5 flex items-center justify-end gap-2';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className =
      'rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300';
    cancelButton.textContent = cancelLabel;

    const okButton = document.createElement('button');
    okButton.type = 'button';
    okButton.className =
      kind === 'error' || kind === 'warning'
        ? 'rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300'
        : 'rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300';
    okButton.textContent = okLabel;

    actions.append(cancelButton, okButton);
    panel.append(titleElement, messageElement);
    if (descriptionElement) {
      panel.append(descriptionElement);
    }
    panel.append(actions);
    overlay.append(panel);

    let settled = false;
    const focusable = [cancelButton, okButton];

    const cleanup = () => {
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.removeEventListener('click', onOverlayClick);
      cancelButton.removeEventListener('click', onCancel);
      okButton.removeEventListener('click', onConfirm);
      overlay.remove();
    };

    const close = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(confirmed);
    };

    const onCancel = () => close(false);
    const onConfirm = () => close(true);

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

      if (event.key === 'Enter') {
        event.preventDefault();
        const active = document.activeElement;
        if (active === okButton) {
          close(true);
        } else {
          close(false);
        }
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
    okButton.addEventListener('click', onConfirm);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeyDown, true);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      cancelButton.focus();
    });
  });
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
