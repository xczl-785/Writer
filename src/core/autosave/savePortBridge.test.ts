import { describe, expect, it, vi } from 'vitest';
import { SaveScheduler } from './SaveScheduler';
import {
  createSaveSchedulerSaveFromSavePort,
  SavePortFailureError,
} from './savePortBridge';
import type { SavePort } from '../save/savePort';

describe('savePortBridge', () => {
  it('adapts SaveScheduler input into a result-returning SavePort call', async () => {
    const save = vi.fn<SavePort['save']>().mockResolvedValue({
      ok: true,
      target: { path: '/note.md' },
      savedAt: 1,
    });
    const scheduler = new SaveScheduler(0, {
      save: createSaveSchedulerSaveFromSavePort({ save }),
    });

    scheduler.schedule('/note.md', 'draft');
    await scheduler.flush('/note.md');

    expect(save).toHaveBeenCalledWith({
      target: { path: '/note.md' },
      content: 'draft',
    });
  });

  it('turns a SaveFailure result into the throw-based scheduler failure path', async () => {
    const cause = new Error('denied');
    const failure = {
      ok: false as const,
      target: { path: '/note.md' },
      error: cause,
      failedAt: 2,
    };
    const onSaveFailed = vi.fn();
    const scheduler = new SaveScheduler(0, {
      save: createSaveSchedulerSaveFromSavePort({
        save: vi.fn<SavePort['save']>().mockResolvedValue(failure),
      }),
      onSaveFailed,
    });

    scheduler.schedule('/note.md', 'draft');

    await expect(scheduler.flush('/note.md')).rejects.toMatchObject({
      name: 'SavePortFailureError',
      result: failure,
    });
    expect(onSaveFailed).toHaveBeenCalledWith(
      { path: '/note.md', content: 'draft' },
      expect.any(SavePortFailureError),
      expect.any(Function),
    );
  });
});
