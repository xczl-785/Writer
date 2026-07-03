import { SaveScheduler } from '../../../core/autosave/SaveScheduler';
import { FsService } from './FsService';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { useEditorStore } from '../../editor/state/editorStore';
import { EDITOR_CONFIG } from '../../../config/editor';
import { ErrorService } from '../../../services/error/ErrorService';
import { useNotificationStore } from '../../../state/slices/notificationSlice';
import type {
  SaveSchedulerInput,
  SaveSchedulerRetry,
} from '../../../core/autosave/SaveScheduler';

const DEBOUNCE_MS = EDITOR_CONFIG.autosave.debounceMs;
const AUTOSAVE_SOURCE = 'autosave';

const buildAutosaveFailure = (path: string, retry: SaveSchedulerRetry) => ({
  level: 'level1' as const,
  source: AUTOSAVE_SOURCE,
  reason: `Failed to save ${path}`,
  suggestion: 'Please check permissions or retry save.',
  dedupeKey: `autosave:${path}`,
  actions: [
    {
      label: 'Retry',
      run: () => {
        void retry();
      },
    },
  ],
});

const scheduler = new SaveScheduler(DEBOUNCE_MS, {
  save: async ({ path, content }: SaveSchedulerInput): Promise<void> => {
    await FsService.writeFileAtomic(path, content);
  },
  onScheduled: () => {
    useStatusStore.getState().markDirty();
  },
  onSaveStarted: ({ path }) => {
    useStatusStore.getState().markSaving(path);
  },
  onSaveSucceeded: ({ path }) => {
    useEditorStore.getState().setDirty(path, false);
    useNotificationStore.getState().dismissLevel1(AUTOSAVE_SOURCE);
    useStatusStore.getState().markSaved('Saved');
  },
  onSaveFailed: ({ path }, error, retry) => {
    useStatusStore.getState().markSaveFailed(`Failed to save ${path}`);
    ErrorService.handleWithInfo(
      error,
      `Failed to autosave ${path}`,
      buildAutosaveFailure(path, retry),
    );
  },
});

export const AutosaveService = {
  schedule(path: string, content: string): void {
    scheduler.schedule(path, content);
  },

  async flush(path: string): Promise<void> {
    await scheduler.flush(path);
  },

  cancel(path: string): void {
    scheduler.cancel(path);
  },

  async flushAll(): Promise<void> {
    await scheduler.flushAll();
  },

  isPending(path: string): boolean {
    return scheduler.isPending(path);
  },
};
