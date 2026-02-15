import { FsService } from '../fs/FsService';
import { useStatusStore } from '../../state/slices/statusSlice';

const DEBOUNCE_MS = 800;

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

    try {
      useStatusStore.getState().setStatus('saving', `Saving ${path}...`);
      await FsService.writeFileAtomic(path, content);
      useStatusStore.getState().setStatus('idle', 'Saved');
    } catch (error) {
      console.error(`Failed to autosave ${path}:`, error);
      useStatusStore.getState().setStatus('error', `Failed to save ${path}`);
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
