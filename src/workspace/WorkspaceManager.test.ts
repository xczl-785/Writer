import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openFile } from './WorkspaceManager';
import { useWorkspaceStore } from '../state/slices/workspaceSlice';
import { useEditorStore } from '../state/slices/editorSlice';
import { useStatusStore } from '../state/slices/statusSlice';
import { FsService } from '../services/fs/FsService';
import { AutosaveService } from '../services/autosave/AutosaveService';

vi.mock('../services/fs/FsService', () => ({
  FsService: {
    readFile: vi.fn(),
  },
}));

vi.mock('../services/autosave/AutosaveService', () => ({
  AutosaveService: {
    flush: vi.fn(),
  },
}));

describe('WorkspaceManager - openFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({ activeFile: null, openFiles: [] });
    useEditorStore.setState({ fileStates: {} });
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      saveError: null,
    });
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

    useWorkspaceStore.setState({ activeFile: oldPath, openFiles: [oldPath] });
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

    expect(useStatusStore.getState().status).toBe('error');
    expect(useStatusStore.getState().message).toBe('Failed to open file');
    expect(useWorkspaceStore.getState().activeFile).toBeNull();
  });
});
