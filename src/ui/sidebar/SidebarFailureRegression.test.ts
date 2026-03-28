import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Sidebar } from './Sidebar';
import { t } from '../../shared/i18n';
import { useFileTreeStore } from '../../domains/file/state/fileStore';
import { useWorkspaceStore } from '../../domains/workspace/state/workspaceStore';
import { useNotificationStore } from '../../state/slices/notificationSlice';
import { useStatusStore } from '../../state/slices/statusSlice';

const {
  createFileMock,
  createDirMock,
  listTreeMock,
  renamePathMock,
  flushAffectedFilesMock,
} = vi.hoisted(() => ({
  createFileMock: vi.fn(),
  createDirMock: vi.fn(),
  listTreeMock: vi.fn(),
  renamePathMock: vi.fn(),
  flushAffectedFilesMock: vi.fn(),
}));

vi.mock('../../domains/file/services/FsService', () => ({
  FsService: {
    createFile: createFileMock,
    createDir: createDirMock,
    listTree: listTreeMock,
    revealInFileManager: vi.fn(),
    getPathKind: vi.fn(),
  },
}));

vi.mock('../../domains/file/services/fileActions', () => ({
  fileActions: {
    renamePath: renamePathMock,
    deletePath: vi.fn(),
  },
}));

vi.mock('../../domains/file/services/FsSafety', () => ({
  FsSafety: {
    flushAffectedFiles: flushAffectedFilesMock,
  },
}));

vi.mock('../../domains/workspace/services/WorkspaceManager', () => ({
  addFolderPathToWorkspace: vi.fn(),
  openWorkspaceAtPath: vi.fn(),
  openWorkspace: vi.fn(),
  openFile: vi.fn(),
}));

vi.mock('../../domains/workspace/services/workspaceActions', () => ({
  workspaceActions: {
    moveNode: vi.fn(),
    moveRootFolderUp: vi.fn(),
    moveRootFolderDown: vi.fn(),
    removeFolderFromWorkspace: vi.fn(() => Promise.resolve({ ok: true })),
    openFile: vi.fn(),
  },
}));

vi.mock('../components/Dialog', () => ({
  showDeleteConfirmDialog: vi.fn(),
}));

vi.mock('../../domains/file/services/SingleFileDropHandler', () => ({
  handleDropToEditor: vi.fn(),
}));

function renderSidebar() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(Sidebar));
  });

  return { container, root };
}

async function cleanup(container: HTMLElement, root: Root) {
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

function changeInputValue(input: HTMLInputElement, value: string) {
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    );
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('Sidebar failure handling', () => {
  beforeEach(() => {
    createFileMock.mockReset();
    createDirMock.mockReset();
    listTreeMock.mockReset();
    renamePathMock.mockReset();
    flushAffectedFilesMock.mockReset();

    useFileTreeStore.getState().clearState();
    useWorkspaceStore.getState().clearState();
    useNotificationStore.getState().clearNotifications();
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      saveError: null,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    useFileTreeStore.getState().clearState();
    useWorkspaceStore.getState().clearState();
    useNotificationStore.getState().clearNotifications();
  });

  it('rolls back the ghost row and shows a level2 notification when create fails', async () => {
    createFileMock.mockRejectedValueOnce(new Error('Access denied'));

    useFileTreeStore.setState({
      rootFolders: [{ workspacePath: '/ws', displayName: 'ws', tree: [] }],
      expandedPaths: new Set(['/ws']),
      selectedPath: '/ws',
      loadingPaths: new Set(),
      errorPaths: new Map(),
      deletedPaths: new Set(),
    });
    useWorkspaceStore.setState({
      folders: [{ path: '/ws', index: 0 }],
      workspaceFile: null,
      isDirty: false,
      openFiles: [],
      activeFile: null,
    });

    const { container, root } = renderSidebar();

    const newFileButton = container.querySelector(
      `button[title="${t('sidebar.newFile')}"]`,
    ) as HTMLButtonElement | null;
    expect(newFileButton).not.toBeNull();

    await act(async () => {
      newFileButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const createInput = Array.from(container.querySelectorAll('input')).find(
      (input) => (input as HTMLInputElement).id !== 'explorer-search',
    ) as HTMLInputElement | undefined;
    expect(createInput).toBeDefined();

    changeInputValue(createInput!, 'draft');

    await act(async () => {
      createInput?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    await flushMicrotasks();

    const notification = useNotificationStore.getState().level2Notification;
    expect(notification?.source).toBe('sidebar-create');
    expect(notification?.reason).toBe(t('sidebar.createFailed'));
    expect(notification?.reason).not.toContain('Access denied');
    expect(
      Array.from(container.querySelectorAll('input')).some(
        (input) => (input as HTMLInputElement).value === 'draft',
      ),
    ).toBe(false);

    await cleanup(container, root);
  });

  it('shows a level2 notification when rename fails after blur commit', async () => {
    flushAffectedFilesMock.mockResolvedValueOnce(true);
    renamePathMock.mockRejectedValueOnce(new Error('Access denied'));

    useFileTreeStore.setState({
      rootFolders: [
        {
          workspacePath: '/ws',
          displayName: 'ws',
          tree: [{ path: '/ws/note.md', name: 'note.md', type: 'file' }],
        },
      ],
      expandedPaths: new Set(['/ws']),
      selectedPath: '/ws/note.md',
      loadingPaths: new Set(),
      errorPaths: new Map(),
      deletedPaths: new Set(),
    });
    useWorkspaceStore.setState({
      folders: [{ path: '/ws', index: 0 }],
      workspaceFile: null,
      isDirty: false,
      openFiles: [],
      activeFile: null,
    });

    const { container, root } = renderSidebar();
    const region = container.querySelector('[role="region"]') as HTMLElement | null;
    expect(region).not.toBeNull();

    await act(async () => {
      region?.focus();
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    });

    const renameInput = Array.from(container.querySelectorAll('input')).find(
      (input) => (input as HTMLInputElement).value === 'note',
    ) as HTMLInputElement | undefined;
    expect(renameInput).toBeDefined();

    changeInputValue(renameInput!, 'renamed');

    await act(async () => {
      renameInput?.focus();
      renameInput?.blur();
    });
    await flushMicrotasks();

    const notification = useNotificationStore.getState().level2Notification;
    expect(notification?.source).toBe('sidebar-rename');
    expect(notification?.reason).toBe(t('sidebar.renameFailed'));
    expect(notification?.reason).not.toContain('Access denied');

    await cleanup(container, root);
  });
});
