import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NotificationHost } from './NotificationHost';
import { useNotificationStore } from '../../state/slices/notificationSlice';

function renderHost(scope: 'global' | 'editor') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(NotificationHost, { scope }));
  });

  return { container, root };
}

async function cleanup(container: HTMLElement, root: Root) {
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

describe('NotificationHost', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useNotificationStore.getState().clearNotifications();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    useNotificationStore.getState().clearNotifications();
  });

  it('renders a level2 toast and auto-dismisses it', async () => {
    const { container, root } = renderHost('global');

    act(() => {
      useNotificationStore.getState().showNotification({
        level: 'level2',
        source: 'workspace-open',
        category: 'system',
        reason: 'Failed to open workspace',
        suggestion: 'Retry later',
        ttlMs: 3000,
      });
    });

    expect(container.textContent).toContain('Failed to open workspace');

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(useNotificationStore.getState().level2Notification).toBeNull();

    await cleanup(container, root);
  });

  it('runs the level2 action button callback', async () => {
    const action = vi.fn();
    const { container, root } = renderHost('global');

    act(() => {
      useNotificationStore.getState().showNotification({
        level: 'level2',
        source: 'workspace-open',
        category: 'system',
        reason: 'Failed to open workspace',
        suggestion: 'Retry later',
        actions: [{ label: 'Retry', run: action }],
      });
    });

    const button = container.querySelector('button');
    expect(button?.textContent).toBe('Retry');

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(action).toHaveBeenCalledTimes(1);

    await cleanup(container, root);
  });

  it('renders a persistent level3 banner in editor scope', async () => {
    const { container, root } = renderHost('editor');

    act(() => {
      useNotificationStore.getState().showNotification({
        level: 'level3',
        source: 'window-close',
        category: 'system',
        reason: 'Unsafe to continue editing',
        suggestion: 'Save or discard changes',
      });
    });

    expect(container.textContent).toContain('Unsafe to continue editing');
    expect(container.textContent).toContain('Save or discard changes');

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(useNotificationStore.getState().level3Notification?.source).toBe(
      'window-close',
    );

    await cleanup(container, root);
  });

  it('dismisses the level3 banner from the close button', async () => {
    const { container, root } = renderHost('editor');

    act(() => {
      useNotificationStore.getState().showNotification({
        level: 'level3',
        source: 'window-close',
        category: 'system',
        reason: 'Unsafe to continue editing',
        suggestion: 'Save or discard changes',
      });
    });

    const button = Array.from(container.querySelectorAll('button')).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === 'Dismiss notification',
    );

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(useNotificationStore.getState().level3Notification).toBeNull();

    await cleanup(container, root);
  });
});
