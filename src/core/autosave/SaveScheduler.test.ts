import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveScheduler } from './SaveScheduler';
import type { SaveSchedulerInput, SaveSchedulerRetry } from './SaveScheduler';

describe('SaveScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces repeated schedule calls and saves the latest content', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const onScheduled = vi.fn<(input: SaveSchedulerInput) => void>();
    const scheduler = new SaveScheduler(100, { save, onScheduled });

    scheduler.schedule('/note.md', 'first');
    scheduler.schedule('/note.md', 'second');

    expect(scheduler.isPending('/note.md')).toBe(true);
    expect(onScheduled).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(99);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({
      path: '/note.md',
      content: 'second',
    });
    expect(scheduler.isPending('/note.md')).toBe(false);
  });

  it('treats flush without pending content as a no-op', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const scheduler = new SaveScheduler(100, { save });

    await scheduler.flush('/missing.md');

    expect(save).not.toHaveBeenCalled();
  });

  it('flushes pending content immediately and clears its timer', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const onSaveStarted = vi.fn<(input: SaveSchedulerInput) => void>();
    const onSaveSucceeded = vi.fn<(input: SaveSchedulerInput) => void>();
    const scheduler = new SaveScheduler(100, {
      save,
      onSaveStarted,
      onSaveSucceeded,
    });

    scheduler.schedule('/note.md', 'draft');
    await scheduler.flush('/note.md');
    await vi.advanceTimersByTimeAsync(100);

    expect(save).toHaveBeenCalledTimes(1);
    expect(onSaveStarted).toHaveBeenCalledWith({
      path: '/note.md',
      content: 'draft',
    });
    expect(onSaveSucceeded).toHaveBeenCalledWith({
      path: '/note.md',
      content: 'draft',
    });
    expect(scheduler.isPending('/note.md')).toBe(false);
  });

  it('rejects flush failures and reports retry with the failed content', async () => {
    const error = new Error('denied');
    const save = vi
      .fn<(input: SaveSchedulerInput) => Promise<void>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);
    let retry: SaveSchedulerRetry = async () => {
      throw new Error('Retry was not captured');
    };
    const onSaveFailed = vi.fn(
      (
        _input: SaveSchedulerInput,
        _error: unknown,
        retrySave: SaveSchedulerRetry,
      ) => {
        retry = retrySave;
      },
    );
    const scheduler = new SaveScheduler(100, { save, onSaveFailed });

    scheduler.schedule('/note.md', 'failed draft');

    await expect(scheduler.flush('/note.md')).rejects.toThrow('denied');
    expect(onSaveFailed).toHaveBeenCalledWith(
      { path: '/note.md', content: 'failed draft' },
      error,
      expect.any(Function),
    );

    scheduler.schedule('/note.md', 'new draft');
    await retry();

    expect(save).toHaveBeenLastCalledWith({
      path: '/note.md',
      content: 'failed draft',
    });
    expect(scheduler.isPending('/note.md')).toBe(true);
  });

  it('flushes all pending paths', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const scheduler = new SaveScheduler(100, { save });

    scheduler.schedule('/a.md', 'a');
    scheduler.schedule('/b.md', 'b');

    await scheduler.flushAll();

    expect(save).toHaveBeenCalledTimes(2);
    expect(scheduler.isPending('/a.md')).toBe(false);
    expect(scheduler.isPending('/b.md')).toBe(false);
  });

  it('rejects flushAll when a pending save fails and still clears all pending paths', async () => {
    const save = vi.fn(async ({ path }: SaveSchedulerInput): Promise<void> => {
      if (path === '/a.md') {
        throw new Error('denied');
      }
    });
    const scheduler = new SaveScheduler(100, { save });

    scheduler.schedule('/a.md', 'a');
    scheduler.schedule('/b.md', 'b');

    await expect(scheduler.flushAll()).rejects.toThrow('denied');

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith({ path: '/a.md', content: 'a' });
    expect(save).toHaveBeenCalledWith({ path: '/b.md', content: 'b' });
    expect(scheduler.isPending('/a.md')).toBe(false);
    expect(scheduler.isPending('/b.md')).toBe(false);
  });

  it('cancels pending saves', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const scheduler = new SaveScheduler(100, { save });

    scheduler.schedule('/note.md', 'draft');
    scheduler.cancel('/note.md');
    await vi.advanceTimersByTimeAsync(100);

    expect(save).not.toHaveBeenCalled();
    expect(scheduler.isPending('/note.md')).toBe(false);
  });
});
