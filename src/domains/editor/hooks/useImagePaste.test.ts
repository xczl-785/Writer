import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Editor } from '@tiptap/react';
import { useImagePaste, generateUniqueFilename } from './useImagePaste';
import { getRelativePath } from '../../../shared/utils/pathUtils';
import { useWorkspaceStore } from '../../workspace/state/workspaceStore';
import { FsService } from '../../file/services/FsService';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { ImageResolver } from '../../../services/images/ImageResolver';

vi.mock('../../workspace/state/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../../../state/slices/statusSlice', () => ({
  useStatusStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../../file/services/FsService', () => ({
  FsService: {
    saveImage: vi.fn(),
    checkExists: vi.fn(),
  },
}));

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

describe('getRelativePath', () => {
  it('should handle same directory', () => {
    const from = '/Users/user/project/docs/file.md';
    const to = '/Users/user/project/docs/image.png';
    expect(getRelativePath(from, to)).toBe('./image.png');
  });

  it('should handle child directory', () => {
    const from = '/Users/user/project/docs/file.md';
    const to = '/Users/user/project/docs/assets/image.png';
    expect(getRelativePath(from, to)).toBe('./assets/image.png');
  });

  it('should handle sibling directory', () => {
    const from = '/Users/user/project/docs/file.md';
    const to = '/Users/user/project/images/image.png';
    expect(getRelativePath(from, to)).toBe('../images/image.png');
  });

  it('should handle parent directory', () => {
    const from = '/Users/user/project/docs/subdir/file.md';
    const to = '/Users/user/project/docs/image.png';
    expect(getRelativePath(from, to)).toBe('../image.png');
  });

  it('should handle deeply nested paths', () => {
    const from = '/Users/user/project/docs/a/b/c/file.md';
    const to = '/Users/user/project/docs/assets/image.png';
    expect(getRelativePath(from, to)).toBe('../../../assets/image.png');
  });

  it('should handle Windows-style paths', () => {
    const from = 'C:\\Users\\user\\project\\docs\\file.md';
    const to = 'C:\\Users\\user\\project\\docs\\assets\\image.png';
    expect(getRelativePath(from, to)).toBe('./assets/image.png');
  });
});

describe('useImagePaste', () => {
  const mockEditor = {
    commands: {
      setImage: vi.fn(),
    },
  } as unknown as Editor;

  const mockWorkspaceState = {
    activeFile: '/project/docs/file.md',
    folders: [{ path: '/project/docs', index: 0 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
      if (selector) {
        return selector(mockWorkspaceState as any);
      }
      return mockWorkspaceState;
    });
    vi.mocked(useStatusStore.getState).mockReturnValue(createStatusState());
    vi.mocked(FsService.saveImage).mockResolvedValue(undefined);
    vi.mocked(FsService.checkExists).mockResolvedValue(false);
    vi.mocked(ImageResolver.resolve).mockReturnValue(
      'asset:///project/docs/assets/image.png',
    );
  });

  it('should reject unsupported image formats and set status error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setStatusMock = vi.fn();
    vi.mocked(useStatusStore.getState).mockReturnValue(
      createStatusState(setStatusMock),
    );

    const { handlePaste } = useImagePaste(mockEditor);

    const mockEvent = {
      clipboardData: {
        items: [
          {
            type: 'image/gif',
            getAsFile: () => ({ size: 1024 }),
          },
        ],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    await handlePaste(mockEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Unsupported image format]',
      'image/gif',
    );
    expect(setStatusMock).toHaveBeenCalledWith(
      'error',
      'Failed to paste image: unsupported format',
    );
    expect(mockEditor.commands.setImage).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should reject large images and set status error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setStatusMock = vi.fn();
    vi.mocked(useStatusStore.getState).mockReturnValue(
      createStatusState(setStatusMock),
    );

    const { handlePaste } = useImagePaste(mockEditor);

    const mockEvent = {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => ({ size: 11 * 1024 * 1024 }),
          },
        ],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    await handlePaste(mockEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Image too large (max 10MB)]',
      11 * 1024 * 1024,
    );
    expect(setStatusMock).toHaveBeenCalledWith(
      'error',
      'Failed to paste image: image too large (max 10MB)',
    );
    expect(mockEditor.commands.setImage).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should set status error when save fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setStatusMock = vi.fn();
    vi.mocked(useStatusStore.getState).mockReturnValue(
      createStatusState(setStatusMock),
    );

    vi.mocked(FsService.saveImage).mockRejectedValue(new Error('Save failed'));

    const { handlePaste } = useImagePaste(mockEditor);

    const mockFile = {
      size: 1024,
      type: 'image/png',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    const mockEvent = {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => mockFile,
          },
        ],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    await handlePaste(mockEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Failed to save image]',
      expect.any(Error),
    );
    expect(setStatusMock).toHaveBeenCalledWith('error', 'Failed to save image');
    consoleSpy.mockRestore();
  });

  it('should accept supported image formats', async () => {
    const { handlePaste } = useImagePaste(mockEditor);

    const mockFile = {
      size: 1024,
      type: 'image/png',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    const mockEvent = {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => mockFile,
          },
        ],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    await handlePaste(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should use unique filename when pasting', async () => {
    vi.mocked(FsService.checkExists)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    const { handlePaste } = useImagePaste(mockEditor);

    const mockFile = {
      size: 1024,
      type: 'image/png',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    const mockEvent = {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => mockFile,
          },
        ],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    await handlePaste(mockEvent);

    expect(FsService.saveImage).toHaveBeenCalledWith(
      expect.stringMatching(/-1\.png$/),
      expect.any(Uint8Array),
    );
  });

  it('should show raw to resolved image diagnostic when enabled', async () => {
    vi.stubEnv('VITE_SHOW_IMAGE_DIAGNOSTIC', '1');
    const setStatusMock = vi.fn();
    vi.mocked(useStatusStore.getState).mockReturnValue(
      createStatusState(setStatusMock),
    );

    const { handlePaste } = useImagePaste(mockEditor);

    const mockFile = {
      size: 1024,
      type: 'image/png',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    const mockEvent = {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => mockFile,
          },
        ],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    await handlePaste(mockEvent);

    expect(ImageResolver.resolve).toHaveBeenCalledWith(
      expect.stringMatching(/^\.assets\/image-\d{8}-\d{6}\.png$/),
      '/project/docs/file.md',
    );
    expect(setStatusMock).toHaveBeenCalledWith(
      'idle',
      expect.stringMatching(
        /^Image src: \.assets\/image-\d{8}-\d{6}\.png -> asset:\/\/\/project\/docs\/assets\/image\.png$/,
      ),
    );
  });
});

describe('generateUniqueFilename', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return base name if it does not exist', async () => {
    vi.mocked(FsService.checkExists).mockResolvedValue(false);
    const result = await generateUniqueFilename('/dir', 'image', 'png');
    expect(result).toBe('/dir/image.png');
    expect(FsService.checkExists).toHaveBeenCalledWith('/dir/image.png');
  });

  it('should increment suffix if file exists', async () => {
    vi.mocked(FsService.checkExists)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await generateUniqueFilename('/dir', 'image', 'png');
    expect(result).toBe('/dir/image-2.png');
    expect(FsService.checkExists).toHaveBeenCalledTimes(3);
  });
});
