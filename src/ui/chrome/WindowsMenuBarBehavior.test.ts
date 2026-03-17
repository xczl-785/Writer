import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { WindowsMenuBar } from './WindowsMenuBar';
import { menuCommandBus } from '../commands/menuCommandBus';
import { setLocale } from '../../shared/i18n';

vi.mock('../../domains/workspace/services/RecentItemsService', () => ({
  RECENT_ITEMS_CHANGED_EVENT: 'writer:recent-items-changed',
  RecentItemsService: {
    getAll: vi.fn(() =>
      Promise.resolve({
        workspaces: [
          {
            type: 'workspace',
            path: '/recent/workspace.writer-workspace',
            name: 'Recent Workspace',
            lastOpened: new Date().toISOString(),
          },
        ],
        folders: [],
        files: [],
      }),
    ),
  },
}));

function renderMenuBar() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      createElement(WindowsMenuBar, {
        hasRecentItems: true,
        platform: 'windows',
      }),
    );
  });

  return { container, root };
}

async function cleanup(container: HTMLElement, root: Root) {
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

function getTopLevelButton(container: HTMLElement, label: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'));
  const match = buttons.find((button) => button.textContent?.trim() === label);
  if (!match) {
    throw new Error(`Unable to find top-level button: ${label}\n${container.innerHTML}`);
  }
  return match as HTMLButtonElement;
}

function getMenuItem(container: HTMLElement, label: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'));
  const match = buttons.find((button) => {
    const text = button.textContent?.replace(/\s+/g, ' ').trim();
    return text?.startsWith(label);
  });
  if (!match) {
    throw new Error(`Unable to find menu item: ${label}\n${container.innerHTML}`);
  }
  return match as HTMLButtonElement;
}

describe('WindowsMenuBar behavior', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    setLocale('zh-CN');
    vi.useRealTimers();
  });

  it('switches open groups on hover after a menu is already open', async () => {
    setLocale('en-US');
    const { container, root } = renderMenuBar();

    const fileButton = getTopLevelButton(container, 'File');
    const editButton = getTopLevelButton(container, 'Edit');

    await act(async () => {
      fileButton.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Open Folder');
    expect(container.textContent).not.toContain('Undo');

    await act(async () => {
      editButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('Open Folder');
    expect(container.textContent).toContain('Undo');

    await cleanup(container, root);
  });

  it('moves between top-level menus with horizontal arrow keys', async () => {
    setLocale('en-US');
    const { container, root } = renderMenuBar();

    const fileButton = getTopLevelButton(container, 'File');
    fileButton.focus();

    await act(async () => {
      fileButton.click();
      await Promise.resolve();
    });

    await act(async () => {
      fileButton.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(document.activeElement?.textContent?.trim()).toBe('Edit');
    expect(container.textContent).toContain('Undo');

    await cleanup(container, root);
  });

  it('enters menu items with ArrowDown and dispatches the focused command with Enter', async () => {
    setLocale('en-US');
    const { container, root } = renderMenuBar();
    const handler = vi.fn();
    const unregister = menuCommandBus.register('menu.file.new', handler);

    const fileButton = getTopLevelButton(container, 'File');
    fileButton.focus();

    await act(async () => {
      fileButton.click();
      await Promise.resolve();
    });

    await act(async () => {
      fileButton.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await Promise.resolve();
    });

    const newItem = getMenuItem(container, 'New File');
    expect(document.activeElement).toBe(newItem);

    await act(async () => {
      newItem.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(handler).toHaveBeenCalledTimes(1);

    unregister();
    await cleanup(container, root);
  });

  it('shows recent items in a cascading submenu from the file menu', async () => {
    setLocale('en-US');
    const { container, root } = renderMenuBar();

    const fileButton = getTopLevelButton(container, 'File');

    await act(async () => {
      fileButton.click();
      await Promise.resolve();
    });

    const openRecentItem = getMenuItem(container, 'Open Recent');
    await act(async () => {
      openRecentItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await Promise.resolve();
    });

    expect(openRecentItem.textContent).toContain('Open Recent');
    expect(container.textContent).toContain('Recent Workspace');
    expect(container.textContent).toContain('Clear All History');
    await cleanup(container, root);
  });

  it('dispatches a custom event when a recent item is clicked', async () => {
    setLocale('en-US');
    const { container, root } = renderMenuBar();
    const eventSpy = vi.fn();
    window.addEventListener('writer:open-recent-item', eventSpy as EventListener);

    const fileButton = getTopLevelButton(container, 'File');

    await act(async () => {
      fileButton.click();
      await Promise.resolve();
    });

    const openRecentItem = getMenuItem(container, 'Open Recent');

    await act(async () => {
      openRecentItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await Promise.resolve();
    });

    const recentWorkspaceItem = getMenuItem(container, 'Recent Workspace');

    await act(async () => {
      recentWorkspaceItem.click();
      await Promise.resolve();
    });

    expect(eventSpy).toHaveBeenCalledTimes(1);
    window.removeEventListener(
      'writer:open-recent-item',
      eventSpy as EventListener,
    );
    await cleanup(container, root);
  });

  it('keeps a submenu open briefly while the pointer crosses the gap', async () => {
    vi.useFakeTimers();
    setLocale('en-US');
    const { container, root } = renderMenuBar();

    const fileButton = getTopLevelButton(container, 'File');

    await act(async () => {
      fileButton.click();
      await Promise.resolve();
    });

    const openRecentItem = getMenuItem(container, 'Open Recent');

    await act(async () => {
      openRecentItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Recent Workspace');

    await act(async () => {
      openRecentItem.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Recent Workspace');

    await act(async () => {
      vi.advanceTimersByTime(60);
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('Recent Workspace');
    await cleanup(container, root);
  });
});
