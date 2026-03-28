import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutosaveService } from './AutosaveService';
import { FsService } from './FsService';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { useNotificationStore } from '../../../state/slices/notificationSlice';
import { useEditorStore } from '../../editor/state/editorStore';

vi.mock('./FsService', () => ({
  FsService: {
    writeFileAtomic: vi.fn(),
  },
}));

describe('AutosaveService notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      saveError: null,
    });
    useNotificationStore.getState().clearNotifications();
    useEditorStore.setState({
      fileStates: {
        '/notes/today.md': {
          content: 'draft',
          cursor: { line: 0, column: 0 },
          isDirty: true,
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    AutosaveService.cancel('/notes/today.md');
    useNotificationStore.getState().clearNotifications();
  });

  it('routes autosave failures into level1 and marks save status as error', async () => {
    vi.mocked(FsService.writeFileAtomic).mockRejectedValue(
      new Error('Permission denied'),
    );

    AutosaveService.schedule('/notes/today.md', 'draft');

    await expect(AutosaveService.flush('/notes/today.md')).rejects.toThrow(
      'Permission denied',
    );

    const notification = useNotificationStore.getState().level1Notification;
    expect(notification?.level).toBe('level1');
    expect(notification?.source).toBe('autosave');
    expect(notification?.reason).toBe('Failed to save /notes/today.md');
    expect(useStatusStore.getState().saveStatus).toBe('error');
    expect(useStatusStore.getState().saveError).toBeNull();
  });

  it('clears the active autosave level1 notification after a successful retry', async () => {
    vi.mocked(FsService.writeFileAtomic).mockRejectedValueOnce(
      new Error('Permission denied'),
    );

    AutosaveService.schedule('/notes/today.md', 'draft');
    await expect(AutosaveService.flush('/notes/today.md')).rejects.toThrow(
      'Permission denied',
    );

    vi.mocked(FsService.writeFileAtomic).mockResolvedValue(undefined);

    AutosaveService.schedule('/notes/today.md', 'draft 2');
    await AutosaveService.flush('/notes/today.md');

    expect(useNotificationStore.getState().level1Notification).toBeNull();
    expect(useStatusStore.getState().saveStatus).toBe('saved');
  });
});
