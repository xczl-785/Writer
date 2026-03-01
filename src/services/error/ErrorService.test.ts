import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorService } from './ErrorService';
import { useStatusStore } from '../../state/slices/statusSlice';

describe('ErrorService', () => {
  beforeEach(() => {
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      saveError: null,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies permission errors and stores save error details', () => {
    const info = ErrorService.handleWithInfo(
      new Error('Permission denied'),
      'autosave',
    );

    expect(info.category).toBe('permission');
    expect(info.reason).toBe('无法写入文件');
    expect(info.suggestion).toContain('权限');

    const state = useStatusStore.getState();
    expect(state.saveStatus).toBe('error');
    expect(state.saveError?.category).toBe('permission');
    expect(state.saveError?.reason).toBe('无法写入文件');
  });

  it('supports custom reason/suggestion and recover action', () => {
    const retry = vi.fn();

    const info = ErrorService.handleWithInfo(
      new Error('save failed'),
      'autosave',
      {
        reason: 'Failed to save note.md',
        suggestion: 'Retry now',
        action: {
          label: 'Retry',
          run: retry,
        },
      },
    );

    expect(info.reason).toBe('Failed to save note.md');
    expect(info.suggestion).toBe('Retry now');
    expect(info.action?.label).toBe('Retry');
    expect(useStatusStore.getState().saveError?.action?.label).toBe('Retry');
  });

  it('returns structured info from handleAsyncWithInfo', async () => {
    const { result, info } = await ErrorService.handleAsyncWithInfo(
      Promise.reject(new Error('Network timeout')),
      'sync',
    );

    expect(result).toBeNull();
    expect(info?.category).toBe('network');
    expect(info?.reason).toBe('网络连接失败');
  });
});
