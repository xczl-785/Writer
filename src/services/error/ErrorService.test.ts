import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorService } from './ErrorService';
import { useStatusStore } from '../../state/slices/statusSlice';
import { useNotificationStore } from '../../state/slices/notificationSlice';

describe('ErrorService', () => {
  beforeEach(() => {
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      saveError: null,
    });
    useNotificationStore.getState().clearNotifications();
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

  it('routes an explicit level2 error into the notification store', () => {
    const info = ErrorService.handleWithInfo(
      new Error('open failed'),
      'workspace-open',
      {
        level: 'level2',
        source: 'workspace-open',
        reason: 'Failed to open workspace',
        suggestion: 'Retry later',
      },
    );

    expect(info.reason).toBe('Failed to open workspace');
    expect(useNotificationStore.getState().level2Notification?.reason).toBe(
      'Failed to open workspace',
    );
    expect(useStatusStore.getState().saveError).toBeNull();
  });

  it('routes an explicit level3 error into the notification store', () => {
    ErrorService.handleWithInfo(new Error('unsafe close'), 'window-close', {
      level: 'level3',
      source: 'window-close',
      reason: 'Unsafe to continue editing',
      suggestion: 'Save or discard changes',
    });

    const level3 = useNotificationStore.getState().level3Notification;
    expect(level3?.source).toBe('window-close');
    expect(level3?.level).toBe('level3');
  });
});
