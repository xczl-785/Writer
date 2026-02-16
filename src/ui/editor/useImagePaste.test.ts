import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRelativePath,
  useImagePaste,
  generateUniqueFilename,
} from './useImagePaste';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { FsService } from '../../services/fs/FsService';
import { useStatusStore } from '../../state/slices/statusSlice';

vi.mock('../../state/slices/workspaceSlice', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../../state/slices/statusSlice', () => ({
  useStatusStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../../services/fs/FsService', () => ({
  FsService: {
    saveImage: vi.fn(),
    checkExists: vi.fn(),
  },
}));

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
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkspaceStore as any).mockReturnValue({
      activeFile: '/project/docs/file.md',
      currentPath: '/project/docs',
    });
    (useStatusStore.getState as any).mockReturnValue({
      setStatus: vi.fn(),
    });
    vi.mocked(FsService.saveImage).mockResolvedValue(undefined);
    vi.mocked(FsService.checkExists).mockResolvedValue(false);
  });

  it('should reject unsupported image formats and set status error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setStatusMock = vi.fn();
    (useStatusStore.getState as any).mockReturnValue({
      setStatus: setStatusMock,
    });

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
    } as any;

    await handlePaste(mockEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Unsupported image format: image/gif',
    );
    expect(setStatusMock).toHaveBeenCalledWith(
      'error',
      'Unsupported image format',
    );
    expect(mockEditor.commands.setImage).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should reject large images and set status error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setStatusMock = vi.fn();
    (useStatusStore.getState as any).mockReturnValue({
      setStatus: setStatusMock,
    });

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
    } as any;

    await handlePaste(mockEvent);

    expect(consoleSpy).toHaveBeenCalledWith('Image too large (max 10MB)');
    expect(setStatusMock).toHaveBeenCalledWith(
      'error',
      'Image too large (max 10MB)',
    );
    expect(mockEditor.commands.setImage).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should set status error when save fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setStatusMock = vi.fn();
    (useStatusStore.getState as any).mockReturnValue({
      setStatus: setStatusMock,
    });

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
    } as any;

    await handlePaste(mockEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to save image:',
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
    } as any;

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
    } as any;

    await handlePaste(mockEvent);

    expect(FsService.saveImage).toHaveBeenCalledWith(
      expect.stringMatching(/-1\.png$/),
      expect.any(Uint8Array),
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
