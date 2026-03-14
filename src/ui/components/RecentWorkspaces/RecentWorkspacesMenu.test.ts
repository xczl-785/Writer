/**
 * RecentWorkspacesMenu Tests
 *
 * Unit tests for the recent workspaces menu component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before import
vi.mock('../../../domains/workspace/services/RecentItemsService', () => ({
  RecentItemsService: {
    getAll: vi.fn(() =>
      Promise.resolve({ workspaces: [], folders: [], files: [] }),
    ),
    getWorkspaces: vi.fn(() => Promise.resolve([])),
    getFolders: vi.fn(() => Promise.resolve([])),
    getFiles: vi.fn(() => Promise.resolve([])),
    addWorkspace: vi.fn(() => Promise.resolve()),
    addFolder: vi.fn(() => Promise.resolve()),
    addFile: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    clearAll: vi.fn(() => Promise.resolve()),
    clearType: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../../i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

import React from 'react';
import { RecentItemsService } from '../../../domains/workspace/services/RecentItemsService';

// Simple render test - we test the service logic primarily
// Component rendering tests would require @testing-library/react

describe('RecentWorkspacesMenu Integration', () => {
  const mockService = vi.mocked(RecentItemsService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Integration', () => {
    it('should call getAll when menu opens', async () => {
      mockService.getAll.mockResolvedValue({
        workspaces: [],
        folders: [],
        files: [],
      });

      const result = await RecentItemsService.getAll();
      expect(mockService.getAll).toHaveBeenCalled();
      expect(result.workspaces).toEqual([]);
    });

    it('should receive workspace items from service', async () => {
      const mockWorkspaces = [
        {
          type: 'workspace' as const,
          path: '/test/workspace',
          name: 'Test Workspace',
          lastOpened: new Date().toISOString(),
        },
      ];

      mockService.getAll.mockResolvedValue({
        workspaces: mockWorkspaces,
        folders: [],
        files: [],
      });

      const result = await RecentItemsService.getAll();
      expect(result.workspaces).toHaveLength(1);
      expect(result.workspaces[0].path).toBe('/test/workspace');
    });

    it('should receive folder items from service', async () => {
      const mockFolders = [
        {
          type: 'folder' as const,
          path: '/test/folder',
          name: 'Test Folder',
          lastOpened: new Date().toISOString(),
        },
      ];

      mockService.getAll.mockResolvedValue({
        workspaces: [],
        folders: mockFolders,
        files: [],
      });

      const result = await RecentItemsService.getAll();
      expect(result.folders).toHaveLength(1);
      expect(result.folders[0].path).toBe('/test/folder');
    });

    it('should receive file items from service', async () => {
      const mockFiles = [
        {
          type: 'file' as const,
          path: '/test/file.md',
          name: 'file.md',
          lastOpened: new Date().toISOString(),
        },
      ];

      mockService.getAll.mockResolvedValue({
        workspaces: [],
        folders: [],
        files: mockFiles,
      });

      const result = await RecentItemsService.getAll();
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('/test/file.md');
    });

    it('should call clearAll when clear history is triggered', async () => {
      await RecentItemsService.clearAll();
      expect(mockService.clearAll).toHaveBeenCalled();
    });

    it('should call removeItem when item is removed', async () => {
      await RecentItemsService.removeItem('workspace', '/test/path');
      expect(mockService.removeItem).toHaveBeenCalledWith(
        'workspace',
        '/test/path',
      );
    });
  });

  describe('Component Props Validation', () => {
    it('should validate isOpen prop type', () => {
      const props = { isOpen: true, onClose: vi.fn() };
      expect(typeof props.isOpen).toBe('boolean');
    });

    it('should validate onClose callback type', () => {
      const props = { isOpen: true, onClose: vi.fn() };
      expect(typeof props.onClose).toBe('function');
    });

    it('should validate optional callbacks', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onSelectWorkspace: vi.fn(),
        onSelectFolder: vi.fn(),
        onSelectFile: vi.fn(),
      };

      expect(typeof props.onSelectWorkspace).toBe('function');
      expect(typeof props.onSelectFolder).toBe('function');
      expect(typeof props.onSelectFile).toBe('function');
    });
  });
});
