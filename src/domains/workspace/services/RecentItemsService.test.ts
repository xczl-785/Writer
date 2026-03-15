/**
 * RecentItemsService Tests
 *
 * Unit tests for the recent items storage service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock FsService before importing
vi.mock('../../file/services/FsService', () => ({
  FsService: {
    getAppConfigDir: vi.fn(() => Promise.resolve('/mock/config/dir')),
    checkExists: vi.fn(() => Promise.resolve(false)),
    readJsonFile: vi.fn(() =>
      Promise.resolve({ workspaces: [], folders: [], files: [] }),
    ),
    writeJsonFile: vi.fn(() => Promise.resolve()),
  },
}));

import { FsService } from '../../file/services/FsService';
import {
  RecentItemsService,
  RECENT_ITEMS_CHANGED_EVENT,
} from './RecentItemsService';

const mockFsService = vi.mocked(FsService);

describe('RecentItemsService', () => {
  let storedData: {
    workspaces: unknown[];
    folders: unknown[];
    files: unknown[];
  } = {
    workspaces: [],
    folders: [],
    files: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    storedData = { workspaces: [], folders: [], files: [] };

    // Setup mocks
    mockFsService.checkExists.mockImplementation(() =>
      Promise.resolve(
        storedData.workspaces.length > 0 ||
          storedData.folders.length > 0 ||
          storedData.files.length > 0,
      ),
    );
    mockFsService.readJsonFile.mockImplementation(() =>
      Promise.resolve(storedData),
    );
    mockFsService.writeJsonFile.mockImplementation((_path, data) => {
      storedData = data as typeof storedData;
      return Promise.resolve();
    });
  });

  describe('getWorkspaces', () => {
    it('should return empty array when no items stored', async () => {
      const workspaces = await RecentItemsService.getWorkspaces();
      expect(workspaces).toEqual([]);
    });

    it('should return stored workspaces', async () => {
      await RecentItemsService.addWorkspace(
        '/path/to/workspace.writer-workspace',
        'My Workspace',
      );
      const workspaces = await RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].path).toBe('/path/to/workspace.writer-workspace');
      expect(workspaces[0].name).toBe('My Workspace');
    });
  });

  describe('addWorkspace', () => {
    it('should add a workspace to the list', async () => {
      await RecentItemsService.addWorkspace(
        '/path/to/workspace.writer-workspace',
      );
      const workspaces = await RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].type).toBe('workspace');
    });

    it('should move existing workspace to front', async () => {
      await RecentItemsService.addWorkspace('/path/first');
      await RecentItemsService.addWorkspace('/path/second');
      await RecentItemsService.addWorkspace('/path/first');

      const workspaces = await RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(2);
      expect(workspaces[0].path).toBe('/path/first');
    });

    it('should limit to MAX_WORKSPACES (10)', async () => {
      for (let i = 0; i < 15; i++) {
        await RecentItemsService.addWorkspace(`/path/${i}`);
      }

      const workspaces = await RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(10);
      // Most recent should be first
      expect(workspaces[0].path).toBe('/path/14');
    });
  });

  describe('addFolder', () => {
    it('should add a folder to the list', async () => {
      await RecentItemsService.addFolder('/path/to/folder');
      const folders = await RecentItemsService.getFolders();
      expect(folders).toHaveLength(1);
      expect(folders[0].type).toBe('folder');
    });

    it('should limit to MAX_FOLDERS (5)', async () => {
      for (let i = 0; i < 10; i++) {
        await RecentItemsService.addFolder(`/folder/${i}`);
      }

      const folders = await RecentItemsService.getFolders();
      expect(folders).toHaveLength(5);
    });
  });

  describe('addFile', () => {
    it('should add a file to the list', async () => {
      await RecentItemsService.addFile('/path/to/file.md');
      const files = await RecentItemsService.getFiles();
      expect(files).toHaveLength(1);
      expect(files[0].type).toBe('file');
    });

    it('should limit to MAX_FILES (20)', async () => {
      for (let i = 0; i < 25; i++) {
        await RecentItemsService.addFile(`/file/${i}.md`);
      }

      const files = await RecentItemsService.getFiles();
      expect(files).toHaveLength(20);
    });
  });

  describe('removeItem', () => {
    it('should remove a workspace by path', async () => {
      await RecentItemsService.addWorkspace('/path/to/remove');
      await RecentItemsService.addWorkspace('/path/to/keep');
      await RecentItemsService.removeItem('workspace', '/path/to/remove');

      const workspaces = await RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].path).toBe('/path/to/keep');
    });

    it('should remove a folder by path', async () => {
      await RecentItemsService.addFolder('/folder/to/remove');
      await RecentItemsService.removeItem('folder', '/folder/to/remove');

      const folders = await RecentItemsService.getFolders();
      expect(folders).toHaveLength(0);
    });

    it('should remove a file by path', async () => {
      await RecentItemsService.addFile('/file/to/remove.md');
      await RecentItemsService.removeItem('file', '/file/to/remove.md');

      const files = await RecentItemsService.getFiles();
      expect(files).toHaveLength(0);
    });
  });

  describe('clearAll', () => {
    it('should clear all items', async () => {
      await RecentItemsService.addWorkspace('/workspace');
      await RecentItemsService.addFolder('/folder');
      await RecentItemsService.addFile('/file.md');

      await RecentItemsService.clearAll();

      expect(await RecentItemsService.getWorkspaces()).toHaveLength(0);
      expect(await RecentItemsService.getFolders()).toHaveLength(0);
      expect(await RecentItemsService.getFiles()).toHaveLength(0);
    });
  });

  describe('change events', () => {
    it('emits a browser event after mutating recent items', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      await RecentItemsService.addFolder('/folder');

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: RECENT_ITEMS_CHANGED_EVENT }),
      );
    });
  });

  describe('clearType', () => {
    it('should clear only workspaces', async () => {
      await RecentItemsService.addWorkspace('/workspace');
      await RecentItemsService.addFolder('/folder');
      await RecentItemsService.addFile('/file.md');

      await RecentItemsService.clearType('workspace');

      expect(await RecentItemsService.getWorkspaces()).toHaveLength(0);
      expect(await RecentItemsService.getFolders()).toHaveLength(1);
      expect(await RecentItemsService.getFiles()).toHaveLength(1);
    });
  });

  describe('getAll', () => {
    it('should return all items grouped by type', async () => {
      await RecentItemsService.addWorkspace('/workspace');
      await RecentItemsService.addFolder('/folder');
      await RecentItemsService.addFile('/file.md');

      const all = await RecentItemsService.getAll();

      expect(all.workspaces).toHaveLength(1);
      expect(all.folders).toHaveLength(1);
      expect(all.files).toHaveLength(1);
    });
  });
});
