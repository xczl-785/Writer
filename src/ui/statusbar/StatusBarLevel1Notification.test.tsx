import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StatusBar } from './StatusBar';
import { useStatusStore } from '../../state/slices/statusSlice';
import { useNotificationStore } from '../../state/slices/notificationSlice';
import { useWorkspaceStore } from '../../domains/workspace/state/workspaceStore';
import { useEditorStore } from '../../domains/editor/state/editorStore';

vi.mock('../../domains/file/services/FsService', () => ({
  FsService: {
    detectFileEncoding: vi.fn(() => Promise.resolve({ label: 'UTF-8' })),
  },
}));

function renderStatusBar() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(StatusBar));
  });

  return { container, root };
}

async function cleanup(container: HTMLElement, root: Root) {
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

describe('StatusBar level1 notifications', () => {
  beforeEach(() => {
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      saveError: null,
    });
    useNotificationStore.getState().clearNotifications();
    useWorkspaceStore.getState().clearState();
    useEditorStore.setState({ fileStates: {} });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    useNotificationStore.getState().clearNotifications();
  });

  it('renders level1 notifications as the active status-bar error state', async () => {
    const retry = vi.fn();
    const { container, root } = renderStatusBar();

    act(() => {
      useNotificationStore.getState().showNotification({
        level: 'level1',
        source: 'autosave',
        category: 'permission',
        reason: 'Failed to save note.md',
        suggestion: 'Check write permissions',
        actions: [{ label: 'Retry', run: retry }],
      });
    });

    const statusBar = container.querySelector('.status-bar');
    expect(statusBar?.className).toContain('error');
    expect(container.textContent).toContain('Failed to save note.md');
    expect(container.textContent).toContain('Check write permissions');

    const actionButton = Array.from(container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === 'Retry',
    );

    await act(async () => {
      actionButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(retry).toHaveBeenCalledTimes(1);

    await cleanup(container, root);
  });
});
