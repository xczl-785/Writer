import { FsService } from './FsService';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { useEditorStore } from '../../editor/state/editorStore';
import { EDITOR_CONFIG } from '../../../config/editor';
import { ErrorService } from '../../../services/error/ErrorService';
import { useNotificationStore } from '../../../state/slices/notificationSlice';

const DEBOUNCE_MS = EDITOR_CONFIG.autosave.debounceMs;

interface PendingSave {
  content: string;
  timer: ReturnType<typeof setTimeout>;
}

const pendingSaves = new Map<string, PendingSave>();
const AUTOSAVE_SOURCE = 'autosave';

const buildAutosaveFailure = (path: string, retry: () => void) => ({
  level: 'level1' as const,
  source: AUTOSAVE_SOURCE,
  reason: `Failed to save ${path}`,
  suggestion: 'Please check permissions or retry save.',
  dedupeKey: `autosave:${path}`,
  actions: [
    {
      label: 'Retry',
      run: retry,
    },
  ],
});

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
        useNotificationStore.getState().dismissLevel1(AUTOSAVE_SOURCE);
        useStatusStore.getState().markSaved('Saved');
      } catch (retryError) {
        useStatusStore.getState().markSaveFailed(`Failed to save ${path}`);
        ErrorService.handleWithInfo(
          retryError,
          `Failed to autosave ${path}`,
          buildAutosaveFailure(path, () => {
            void retrySave();
          }),
        );
      }
    };

    try {
      useStatusStore.getState().markSaving(path);
      await FsService.writeFileAtomic(path, content);
      useEditorStore.getState().setDirty(path, false);
      useNotificationStore.getState().dismissLevel1(AUTOSAVE_SOURCE);
      useStatusStore.getState().markSaved('Saved');
    } catch (error) {
      useStatusStore.getState().markSaveFailed(`Failed to save ${path}`);
      ErrorService.handleWithInfo(
        error,
        `Failed to autosave ${path}`,
        buildAutosaveFailure(path, () => {
          void retrySave();
        }),
      );
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
