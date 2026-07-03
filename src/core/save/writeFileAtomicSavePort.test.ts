import { describe, expect, it, vi } from 'vitest';
import { createWriteFileAtomicSavePort } from './writeFileAtomicSavePort';

describe('writeFileAtomicSavePort', () => {
  it('maps a resolved atomic write to a SaveSuccess result', async () => {
    const writeFileAtomic = vi.fn<() => Promise<void>>().mockResolvedValue();
    const savePort = createWriteFileAtomicSavePort({
      writeFileAtomic,
      now: () => 12,
    });

    await expect(
      savePort.save({ target: { path: '/note.md' }, content: 'draft' }),
    ).resolves.toEqual({
      ok: true,
      target: { path: '/note.md' },
      savedAt: 12,
    });
    expect(writeFileAtomic).toHaveBeenCalledWith('/note.md', 'draft');
  });

  it('maps a thrown or rejected atomic write to a SaveFailure result', async () => {
    const error = new Error('permission denied');
    const writeFileAtomic = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(error);
    const savePort = createWriteFileAtomicSavePort({
      writeFileAtomic,
      now: () => 24,
    });

    await expect(
      savePort.save({ target: { path: '/note.md' }, content: 'draft' }),
    ).resolves.toEqual({
      ok: false,
      target: { path: '/note.md' },
      error,
      failedAt: 24,
    });
  });
});
