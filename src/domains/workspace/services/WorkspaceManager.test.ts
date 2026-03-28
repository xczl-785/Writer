import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openFile } from './WorkspaceManager';
import { useWorkspaceStore } from '../state/workspaceStore';
import { useEditorStore } from '../../editor/state/editorStore';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { useNotificationStore } from '../../../state/slices/notificationSlice';
import { FsService } from '../../file/services/FsService';
import { AutosaveService } from '../../file/services/AutosaveService';
import { t } from '../../../shared/i18n';

vi.mock('../../file/services/FsService', () => ({
  FsService: {
    readFile: vi.fn(),
  },
}));

vi.mock('../../file/services/AutosaveService', () => ({
  AutosaveService: {
    flush: vi.fn(),
  },
}));

describe('WorkspaceManager - openFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      activeFile: null,
      openFiles: [],
      folders: [],
    });
    useEditorStore.setState({ fileStates: {} });
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      saveError: null,
    });
    useNotificationStore.getState().clearNotifications();
  });

  it('should open a file successfully', async () => {
    const path = '/path/to/file.txt';
    const content = 'Hello World';
    vi.mocked(FsService.readFile).mockResolvedValue(content);

    await openFile(path);

    expect(useStatusStore.getState().status).toBe('idle');
    expect(useWorkspaceStore.getState().activeFile).toBe(path);
    expect(useEditorStore.getState().fileStates[path]).toEqual({
      content,
      cursor: { line: 0, column: 0 },
      isDirty: false,
    });
    expect(FsService.readFile).toHaveBeenCalledWith(path);
  });

  it('should flush dirty file before opening new one', async () => {
    const oldPath = '/path/to/old.txt';
    const newPath = '/path/to/new.txt';
    const oldContent = 'Old Content';
    const newContent = 'New Content';

    useWorkspaceStore.setState({
      activeFile: oldPath,
      openFiles: [oldPath],
      folders: [],
    });
    useEditorStore.setState({
      fileStates: {
        [oldPath]: {
          content: oldContent,
          cursor: { line: 0, column: 0 },
          isDirty: true,
        },
      },
    });

    vi.mocked(FsService.readFile).mockResolvedValue(newContent);

    await openFile(newPath);

    expect(AutosaveService.flush).toHaveBeenCalledWith(oldPath);
    expect(FsService.readFile).toHaveBeenCalledWith(newPath);
    expect(useWorkspaceStore.getState().activeFile).toBe(newPath);
    expect(useEditorStore.getState().fileStates[newPath]).toEqual({
      content: newContent,
      cursor: { line: 0, column: 0 },
      isDirty: false,
    });
  });

  it('should handle read errors gracefully', async () => {
    const path = '/path/to/error.txt';
    vi.mocked(FsService.readFile).mockRejectedValue(new Error('Read failed'));

    await openFile(path);

    expect(useStatusStore.getState().status).toBe('idle');
    expect(useStatusStore.getState().message).toBeNull();
    expect(useNotificationStore.getState().level2Notification?.reason).toBe(
      t('file.openFailed'),
    );
    expect(
      useNotificationStore.getState().level2Notification?.actions?.[0]?.label,
    ).toBe(t('error.retry'));
    expect(useWorkspaceStore.getState().activeFile).toBeNull();
  });

  it('routes active flush failures to level2 notifications', async () => {
    const oldPath = '/path/to/old.txt';

    useWorkspaceStore.setState({
      activeFile: oldPath,
      openFiles: [oldPath],
      folders: [],
    });
    useEditorStore.setState({
      fileStates: {
        [oldPath]: {
          content: 'dirty',
          cursor: { line: 0, column: 0 },
          isDirty: true,
        },
      },
    });
    vi.mocked(AutosaveService.flush).mockRejectedValue(new Error('Save failed'));

    await openFile('/path/to/new.txt');

    expect(useNotificationStore.getState().level2Notification?.reason).toBe(
      t('workspace.openFileFlushFailed'),
    );
    expect(
      useNotificationStore.getState().level2Notification?.actions?.[0]?.label,
    ).toBe(t('error.retry'));
  });
});
