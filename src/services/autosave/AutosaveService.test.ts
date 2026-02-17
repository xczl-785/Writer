import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutosaveService } from './AutosaveService';
import { FsService } from '../fs/FsService';
import { useStatusStore } from '../../state/slices/statusSlice';

vi.mock('../fs/FsService', () => ({
  FsService: {
    writeFileAtomic: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../state/slices/statusSlice', () => ({
  useStatusStore: {
    getState: vi.fn().mockReturnValue({
      setStatus: vi.fn(),
    }),
  },
}));

describe('AutosaveService', () => {
  const setStatusMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    AutosaveService.cancel('test.md');
    vi.mocked(useStatusStore.getState).mockReturnValue({
      status: 'idle',
      message: null,
      setStatus: setStatusMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce schedule calls', async () => {
    AutosaveService.schedule('test.md', 'content 1');
    expect(AutosaveService.isPending('test.md')).toBe(true);
    expect(FsService.writeFileAtomic).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    AutosaveService.schedule('test.md', 'content 2');

    vi.advanceTimersByTime(400);
    expect(FsService.writeFileAtomic).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(FsService.writeFileAtomic).toHaveBeenCalledWith(
      'test.md',
      'content 2',
    );
    expect(AutosaveService.isPending('test.md')).toBe(false);
  });

  it('should flush immediately', async () => {
    AutosaveService.schedule('test.md', 'content 1');
    await AutosaveService.flush('test.md');

    expect(FsService.writeFileAtomic).toHaveBeenCalledWith(
      'test.md',
      'content 1',
    );
    expect(AutosaveService.isPending('test.md')).toBe(false);
  });

  it('should cancel pending save', () => {
    AutosaveService.schedule('test.md', 'content 1');
    AutosaveService.cancel('test.md');

    vi.advanceTimersByTime(1000);
    expect(FsService.writeFileAtomic).not.toHaveBeenCalled();
    expect(AutosaveService.isPending('test.md')).toBe(false);
  });

  it('should handle multiple paths independently', async () => {
    AutosaveService.schedule('a.md', 'content a');
    AutosaveService.schedule('b.md', 'content b');

    vi.advanceTimersByTime(800);
    expect(FsService.writeFileAtomic).toHaveBeenCalledWith('a.md', 'content a');
    expect(FsService.writeFileAtomic).toHaveBeenCalledWith('b.md', 'content b');
  });

  it('should flushAll pending saves', async () => {
    AutosaveService.schedule('a.md', 'content a');
    AutosaveService.schedule('b.md', 'content b');

    await AutosaveService.flushAll();

    expect(FsService.writeFileAtomic).toHaveBeenCalledWith('a.md', 'content a');
    expect(FsService.writeFileAtomic).toHaveBeenCalledWith('b.md', 'content b');
    expect(AutosaveService.isPending('a.md')).toBe(false);
    expect(AutosaveService.isPending('b.md')).toBe(false);
  });

  it('should update status on save', async () => {
    AutosaveService.schedule('test.md', 'content');
    await AutosaveService.flush('test.md');

    expect(setStatusMock).toHaveBeenCalledWith('saving', 'Saving test.md...');
    expect(setStatusMock).toHaveBeenCalledWith('idle', 'Saved');
  });

  it('should update status on error', async () => {
    const error = new Error('Save failed');
    vi.mocked(FsService.writeFileAtomic).mockRejectedValueOnce(error);

    AutosaveService.schedule('test.md', 'content');

    await expect(AutosaveService.flush('test.md')).rejects.toThrow(
      'Save failed',
    );

    expect(setStatusMock).toHaveBeenCalledWith('saving', 'Saving test.md...');
    expect(setStatusMock).toHaveBeenCalledWith(
      'error',
      'Failed to save test.md',
    );
  });
});
