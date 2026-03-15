import React, { useCallback, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { t } from '../../../shared/i18n';

export type ConflictDialogAction = 'overwrite' | 'cancel';

export interface FileConflictDialogProps {
  fileName: string;
  onConfirm: (action: ConflictDialogAction) => void;
  onCancel: () => void;
}

export const FileConflictDialog: React.FC<FileConflictDialogProps> = ({
  fileName,
  onConfirm,
  onCancel,
}) => {
  const handleOverwrite = useCallback(
    () => onConfirm('overwrite'),
    [onConfirm],
  );
  const handleCancel = useCallback(() => onCancel(), [onCancel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="absolute inset-0 bg-black/30" onClick={handleCancel} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 id="dialog-title" className="text-lg font-semibold text-zinc-900">
            {t('fileOverwrite.title')}
          </h3>
        </div>
        <div className="mb-6">
          <p className="text-sm text-zinc-600">
            {t('fileOverwrite.message').replace('{name}', fileName)}
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
            onClick={handleCancel}
          >
            {t('fileOverwrite.cancel')}
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-amber-600 text-white hover:bg-amber-700 rounded-md transition-colors"
            onClick={handleOverwrite}
            autoFocus
          >
            {t('fileOverwrite.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

const DIALOG_CONTAINER_ID = 'file-conflict-dialog-container';

function createDialogContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.id = DIALOG_CONTAINER_ID;
  document.body.appendChild(container);
  return container;
}

function removeDialogContainer(container: HTMLDivElement): void {
  if (container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

export async function showFileConflictDialog(
  fileName: string,
): Promise<ConflictDialogAction> {
  const existingContainer = document.getElementById(DIALOG_CONTAINER_ID);
  if (existingContainer) {
    console.warn('[FileConflictDialog] Dialog already open');
    return 'cancel';
  }

  const container = createDialogContainer();
  let resolved = false;

  const cleanup = () => {
    if (resolved) return;
    resolved = true;
    removeDialogContainer(container);
  };

  return new Promise((resolve) => {
    const handleClose = (action: ConflictDialogAction) => {
      cleanup();
      resolve(action);
    };

    import('react-dom/client')
      .then(({ createRoot }) => {
        if (resolved) return;
        const root = createRoot(container);
        const dialog = (
          <FileConflictDialog
            fileName={fileName}
            onConfirm={handleClose}
            onCancel={() => handleClose('cancel')}
          />
        );
        root.render(dialog);
      })
      .catch((error) => {
        console.error(
          '[FileConflictDialog] Failed to load react-dom/client:',
          error,
        );
        cleanup();
        resolve('cancel');
      });
  });
}
