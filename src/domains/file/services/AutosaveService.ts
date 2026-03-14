import { FsService } from './FsService';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { useEditorStore } from '../../../state/slices/editorSlice';
import { EDITOR_CONFIG } from '../../../config/editor';
import { ErrorService } from '../../../services/error/ErrorService';

const DEBOUNCE_MS = EDITOR_CONFIG.autosave.debounceMs;

interface PendingSave {
  content: string;
  timer: ReturnType<typeof setTimeout>;
}

const pendingSaves = new Map<string, PendingSave>();

export const AutosaveService = {
  schedule(path: string, content: string): void {
    const existing = pendingSaves.get(path);
    if (existing) {
      clearTimeout(existing.timer);
    }

    useStatusStore.getState().markDirty();

    const timer = setTimeout(async () => {
      await this.flush(path);
    }, DEBOUNCE_MS);

    pendingSaves.set(path, { content, timer });
  },

  async flush(path: string): Promise<void> {
    const pending = pendingSaves.get(path);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    const content = pending.content;
    pendingSaves.delete(path);

    const retrySave = async (): Promise<void> => {
      try {
        useStatusStore.getState().markSaving(path);
        await FsService.writeFileAtomic(path, content);
        useEditorStore.getState().setDirty(path, false);
        useStatusStore.getState().markSaved('Saved');
      } catch (retryError) {
        ErrorService.handleWithInfo(retryError, `Failed to autosave ${path}`, {
          reason: `Failed to save ${path}`,
          suggestion: 'Please check permissions or retry save.',
          action: {
            label: 'Retry',
            run: () => {
              void retrySave();
            },
          },
        });
      }
    };

    try {
      useStatusStore.getState().markSaving(path);
      await FsService.writeFileAtomic(path, content);
      useEditorStore.getState().setDirty(path, false);
      useStatusStore.getState().markSaved('Saved');
    } catch (error) {
      ErrorService.handleWithInfo(error, `Failed to autosave ${path}`, {
        reason: `Failed to save ${path}`,
        suggestion: 'Please check permissions or retry save.',
        action: {
          label: 'Retry',
          run: () => {
            void retrySave();
          },
        },
      });
      throw error;
    }
  },

  cancel(path: string): void {
    const pending = pendingSaves.get(path);
    if (pending) {
      clearTimeout(pending.timer);
      pendingSaves.delete(path);
    }
  },

  async flushAll(): Promise<void> {
    const paths = Array.from(pendingSaves.keys());
    await Promise.all(paths.map((path) => this.flush(path)));
  },

  isPending(path: string): boolean {
    return pendingSaves.has(path);
  },
};
