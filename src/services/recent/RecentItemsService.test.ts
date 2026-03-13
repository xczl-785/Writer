/**
 * RecentItemsService Tests
 *
 * Unit tests for the recent items storage service.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Store for test isolation
let store: Record<string, string> = {};

// Mock localStorage for Node environment
const mockLocalStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    store = {};
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (index: number) => Object.keys(store)[index] || null,
};

// Apply mock before importing
vi.stubGlobal('localStorage', mockLocalStorage);

import { vi } from 'vitest';
import { RecentItemsService } from './RecentItemsService';

describe('RecentItemsService', () => {
  beforeEach(() => {
    // Clear store before each test
    store = {};
  });

  afterEach(() => {
    store = {};
  });

  describe('getWorkspaces', () => {
    it('should return empty array when no items stored', () => {
      const workspaces = RecentItemsService.getWorkspaces();
      expect(workspaces).toEqual([]);
    });

    it('should return stored workspaces', () => {
      RecentItemsService.addWorkspace('/path/to/workspace.writer-workspace', 'My Workspace');
      const workspaces = RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].path).toBe('/path/to/workspace.writer-workspace');
      expect(workspaces[0].name).toBe('My Workspace');
    });
  });

  describe('addWorkspace', () => {
    it('should add a workspace to the list', () => {
      RecentItemsService.addWorkspace('/path/to/workspace.writer-workspace');
      const workspaces = RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].type).toBe('workspace');
    });

    it('should move existing workspace to front', () => {
      RecentItemsService.addWorkspace('/path/first');
      RecentItemsService.addWorkspace('/path/second');
      RecentItemsService.addWorkspace('/path/first');

      const workspaces = RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(2);
      expect(workspaces[0].path).toBe('/path/first');
    });

    it('should limit to MAX_WORKSPACES (10)', () => {
      for (let i = 0; i < 15; i++) {
        RecentItemsService.addWorkspace(`/path/${i}`);
      }

      const workspaces = RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(10);
      // Most recent should be first
      expect(workspaces[0].path).toBe('/path/14');
    });
  });

  describe('addFolder', () => {
    it('should add a folder to the list', () => {
      RecentItemsService.addFolder('/path/to/folder');
      const folders = RecentItemsService.getFolders();
      expect(folders).toHaveLength(1);
      expect(folders[0].type).toBe('folder');
    });

    it('should limit to MAX_FOLDERS (5)', () => {
      for (let i = 0; i < 10; i++) {
        RecentItemsService.addFolder(`/folder/${i}`);
      }

      const folders = RecentItemsService.getFolders();
      expect(folders).toHaveLength(5);
    });
  });

  describe('addFile', () => {
    it('should add a file to the list', () => {
      RecentItemsService.addFile('/path/to/file.md');
      const files = RecentItemsService.getFiles();
      expect(files).toHaveLength(1);
      expect(files[0].type).toBe('file');
    });

    it('should limit to MAX_FILES (20)', () => {
      for (let i = 0; i < 25; i++) {
        RecentItemsService.addFile(`/file/${i}.md`);
      }

      const files = RecentItemsService.getFiles();
      expect(files).toHaveLength(20);
    });
  });

  describe('removeItem', () => {
    it('should remove a workspace by path', () => {
      RecentItemsService.addWorkspace('/path/to/remove');
      RecentItemsService.addWorkspace('/path/to/keep');
      RecentItemsService.removeItem('workspace', '/path/to/remove');

      const workspaces = RecentItemsService.getWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].path).toBe('/path/to/keep');
    });

    it('should remove a folder by path', () => {
      RecentItemsService.addFolder('/folder/to/remove');
      RecentItemsService.removeItem('folder', '/folder/to/remove');

      const folders = RecentItemsService.getFolders();
      expect(folders).toHaveLength(0);
    });

    it('should remove a file by path', () => {
      RecentItemsService.addFile('/file/to/remove.md');
      RecentItemsService.removeItem('file', '/file/to/remove.md');

      const files = RecentItemsService.getFiles();
      expect(files).toHaveLength(0);
    });
  });

  describe('clearAll', () => {
    it('should clear all items', () => {
      RecentItemsService.addWorkspace('/workspace');
      RecentItemsService.addFolder('/folder');
      RecentItemsService.addFile('/file.md');

      RecentItemsService.clearAll();

      expect(RecentItemsService.getWorkspaces()).toHaveLength(0);
      expect(RecentItemsService.getFolders()).toHaveLength(0);
      expect(RecentItemsService.getFiles()).toHaveLength(0);
    });
  });

  describe('clearType', () => {
    it('should clear only workspaces', () => {
      RecentItemsService.addWorkspace('/workspace');
      RecentItemsService.addFolder('/folder');
      RecentItemsService.addFile('/file.md');

      RecentItemsService.clearType('workspace');

      expect(RecentItemsService.getWorkspaces()).toHaveLength(0);
      expect(RecentItemsService.getFolders()).toHaveLength(1);
      expect(RecentItemsService.getFiles()).toHaveLength(1);
    });
  });

  describe('getAll', () => {
    it('should return all items grouped by type', () => {
      RecentItemsService.addWorkspace('/workspace');
      RecentItemsService.addFolder('/folder');
      RecentItemsService.addFile('/file.md');

      const all = RecentItemsService.getAll();

      expect(all.workspaces).toHaveLength(1);
      expect(all.folders).toHaveLength(1);
      expect(all.files).toHaveLength(1);
    });
  });
});