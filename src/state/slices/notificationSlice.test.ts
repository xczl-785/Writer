import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationStore } from './notificationSlice';

describe('notificationSlice', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearNotifications();
  });

  it('stores a level2 toast notification', () => {
    useNotificationStore.getState().showNotification({
      level: 'level2',
      source: 'workspace-load',
      category: 'system',
      reason: 'Failed to open workspace',
      suggestion: 'Retry later',
    });

    const state = useNotificationStore.getState();
    expect(state.level2Notification?.reason).toBe('Failed to open workspace');
    expect(state.level2Notification?.level).toBe('level2');
  });

  it('replaces the active level2 toast with a newer one', () => {
    useNotificationStore.getState().showNotification({
      level: 'level2',
      source: 'workspace-load',
      category: 'system',
      reason: 'First toast',
      suggestion: 'Ignore',
    });

    useNotificationStore.getState().showNotification({
      level: 'level2',
      source: 'file-open',
      category: 'user',
      reason: 'Second toast',
      suggestion: 'Retry',
    });

    const state = useNotificationStore.getState();
    expect(state.level2Notification?.reason).toBe('Second toast');
    expect(state.level2Notification?.source).toBe('file-open');
  });

  it('keeps a level3 banner active until dismissed', () => {
    const notification = useNotificationStore.getState().showNotification({
      level: 'level3',
      source: 'window-close',
      category: 'system',
      reason: 'Unsafe to continue editing',
      suggestion: 'Save or discard changes',
    });

    expect(useNotificationStore.getState().level3Notification?.id).toBe(
      notification.id,
    );

    useNotificationStore.getState().dismissNotification(notification.id);

    expect(useNotificationStore.getState().level3Notification).toBeNull();
  });

  it('stores a level1 notification separately from save status', () => {
    useNotificationStore.getState().showNotification({
      level: 'level1',
      source: 'autosave',
      category: 'permission',
      reason: 'Failed to save note.md',
      suggestion: 'Check write permissions',
    });

    const state = useNotificationStore.getState();
    expect(state.level1Notification?.level).toBe('level1');
    expect(state.level1Notification?.source).toBe('autosave');
  });

  it('dedupes repeated notifications by dedupe key', () => {
    const action = vi.fn();

    const first = useNotificationStore.getState().showNotification({
      level: 'level2',
      source: 'workspace-load',
      category: 'system',
      reason: 'Workspace failed',
      suggestion: 'Retry later',
      dedupeKey: 'workspace-load:error',
      actions: [{ label: 'Retry', run: action }],
    });

    const second = useNotificationStore.getState().showNotification({
      level: 'level2',
      source: 'workspace-load',
      category: 'system',
      reason: 'Workspace failed again',
      suggestion: 'Retry later',
      dedupeKey: 'workspace-load:error',
    });

    expect(second.id).toBe(first.id);
    expect(useNotificationStore.getState().level2Notification?.reason).toBe(
      'Workspace failed again',
    );
  });

  it('dismisses level1 only when the source matches', () => {
    useNotificationStore.getState().showNotification({
      level: 'level1',
      source: 'autosave',
      category: 'permission',
      reason: 'Failed to save note.md',
      suggestion: 'Check write permissions',
    });

    useNotificationStore.getState().dismissLevel1('workspace-open');
    expect(useNotificationStore.getState().level1Notification?.source).toBe(
      'autosave',
    );

    useNotificationStore.getState().dismissLevel1('autosave');
    expect(useNotificationStore.getState().level1Notification).toBeNull();
  });
});
