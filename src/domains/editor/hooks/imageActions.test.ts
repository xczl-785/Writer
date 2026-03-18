import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import {
  applyImageAction,
  generateUniqueFilename,
  saveAndInsertImageFile,
} from './imageActions';
import { FsService } from '../../file/services/FsService';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { useWorkspaceStore } from '../../workspace/state/workspaceStore';
import { ImageResolver } from '../../../services/images/ImageResolver';
import type {
  WorkspaceActions,
  WorkspaceState,
} from '../../workspace/state/workspaceStore';

vi.mock('../../file/services/FsService', () => ({
  FsService: {
    saveImage: vi.fn(),
    checkExists: vi.fn(),
  },
}));

vi.mock('../../../state/slices/statusSlice', () => ({
  useStatusStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../../workspace/state/workspaceStore', () => {
  const store = vi.fn() as ReturnType<typeof vi.fn> & {
    getState: ReturnType<typeof vi.fn>;
  };
  store.getState = vi.fn();
  return { useWorkspaceStore: store };
});

vi.mock('../../../services/images/ImageResolver', () => ({
  ImageResolver: {
    resolve: vi.fn(),
  },
}));

const createStatusState = (setStatus = vi.fn()) => ({
  status: 'idle' as const,
  message: null as string | null,
  saveStatus: 'saved' as const,
  lastSavedAt: null as number | null,
  saveError: null as { reason: string; suggestion: string } | null,
  setStatus,
  markDirty: vi.fn(),
  markSaving: vi.fn(),
  markSaved: vi.fn(),
  setSaveError: vi.fn(),
});

type WorkspaceStoreMock = typeof useWorkspaceStore & {
  getState: ReturnType<typeof vi.fn>;
};

const mockedWorkspaceStore = useWorkspaceStore as WorkspaceStoreMock;

const createWorkspaceState = (
  partial: Partial<WorkspaceState>,
): WorkspaceState & WorkspaceActions => ({
  folders: [],
  workspaceFile: null,
  isDirty: false,
  openFiles: [],
  activeFile: null,
  setWorkspaceFile: vi.fn(),
  reorderFolders: vi.fn(),
  moveFolderUp: vi.fn(),
  moveFolderDown: vi.fn(),
  addFolder: vi.fn(),
  removeFolder: vi.fn(),
  openFile: vi.fn(),
  closeFile: vi.fn(),
  setActiveFile: vi.fn(),
  renameFile: vi.fn(),
  removePath: vi.fn(),
  setDirty: vi.fn(),
  restoreState: vi.fn(),
  clearState: vi.fn(),
  ...partial,
});

describe('imageActions', () => {
  const editor = {
    commands: {
      setImage: vi.fn(),
    },
  } as unknown as Editor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.mocked(FsService.checkExists).mockResolvedValue(false);
    vi.mocked(FsService.saveImage).mockResolvedValue(undefined);
    mockedWorkspaceStore.getState.mockReturnValue(
      createWorkspaceState({
        activeFile: '/project/docs/file.md',
        folders: [{ path: '/project/docs', index: 0 }],
      }),
    );
    vi.mocked(useStatusStore.getState).mockReturnValue(createStatusState());
    vi.mocked(ImageResolver.resolve).mockReturnValue(
      'asset:///project/docs/assets/image.png',
    );
  });

  it('applies image action through file picker and workspace path', async () => {
    const file = {
      size: 1024,
      type: 'image/png',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as unknown as File;

    const result = await applyImageAction(editor, async () => file);

    expect(result).toBe('applied');
    expect(FsService.saveImage).toHaveBeenCalledWith(
      expect.stringMatching(/\/assets\/image-\d{8}-\d{6}\.png$/),
      expect.any(Uint8Array),
    );
    expect(editor.commands.setImage).toHaveBeenCalledWith({
      src: expect.stringMatching(/^\.\/assets\/image-\d{8}-\d{6}\.png$/),
    });
  });

  it('returns cancelled when file picker is dismissed', async () => {
    const result = await applyImageAction(editor, async () => null);

    expect(result).toBe('cancelled');
    expect(FsService.saveImage).not.toHaveBeenCalled();
    expect(editor.commands.setImage).not.toHaveBeenCalled();
  });

  it('reports unsupported image format during insertion', async () => {
    const setStatus = vi.fn();
    vi.mocked(useStatusStore.getState).mockReturnValue(
      createStatusState(setStatus),
    );
    const file = {
      size: 1024,
      type: 'image/gif',
      arrayBuffer: vi.fn(),
    } as unknown as File;

    const result = await saveAndInsertImageFile(editor, file, {
      activeFile: '/project/docs/file.md',
      folders: [{ path: '/project/docs' }],
    });

    expect(result).toBe('failed');
    expect(setStatus).toHaveBeenCalledWith(
      'error',
      'Failed to insert image: unsupported format',
    );
    expect(editor.commands.setImage).not.toHaveBeenCalled();
  });

  it('returns unavailable when there is no active workspace file', async () => {
    const file = {
      size: 1024,
      type: 'image/png',
      arrayBuffer: vi.fn(),
    } as unknown as File;

    const result = await saveAndInsertImageFile(editor, file, {
      activeFile: null,
      folders: [{ path: '/project/docs' }],
    });

    expect(result).toBe('unavailable');
    expect(FsService.saveImage).not.toHaveBeenCalled();
  });
});

describe('generateUniqueFilename', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.mocked(FsService.checkExists).mockResolvedValue(false);
    vi.mocked(FsService.saveImage).mockResolvedValue(undefined);
    mockedWorkspaceStore.getState.mockReturnValue(
      createWorkspaceState({
        activeFile: '/project/docs/file.md',
        folders: [{ path: '/project/docs', index: 0 }],
      }),
    );
    vi.mocked(useStatusStore.getState).mockReturnValue(createStatusState());
    vi.mocked(ImageResolver.resolve).mockReturnValue(
      'asset:///project/docs/assets/image.png',
    );
  });

  it('returns base name if it does not exist', async () => {
    vi.mocked(FsService.checkExists).mockResolvedValue(false);
    const result = await generateUniqueFilename('/dir', 'image', 'png');
    expect(result).toBe('/dir/image.png');
    expect(FsService.checkExists).toHaveBeenCalledWith('/dir/image.png');
  });

  it('increments suffix if the target already exists', async () => {
    vi.mocked(FsService.checkExists)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await generateUniqueFilename('/dir', 'image', 'png');
    expect(result).toBe('/dir/image-2.png');
    expect(FsService.checkExists).toHaveBeenCalledTimes(3);
  });
});
