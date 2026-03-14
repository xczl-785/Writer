/**
 * Recent Items Storage Service
 *
 * Manages persistent storage of recently opened workspaces, folders, and files.
 * Uses Tauri file system storage (app config directory) for cross-platform persistence.
 *
 * @see docs/current/阶段文档/V6-工作区功能需求文档.md - WS-09, WS-10
 * @see docs/current/阶段文档/V6-工作区交互设计规范.md - 2.5 最近项目菜单
 */

import { FsService } from '../../file/services/FsService';

export type RecentItemType = 'workspace' | 'folder' | 'file';

export interface RecentWorkspace {
  type: 'workspace';
  /** Path to .writer-workspace file */
  path: string;
  /** Display name (workspace file name without extension) */
  name: string;
  /** Last opened timestamp (ISO string) */
  lastOpened: string;
}

export interface RecentFolder {
  type: 'folder';
  /** Folder path */
  path: string;
  /** Display name (folder name) */
  name: string;
  /** Last opened timestamp */
  lastOpened: string;
}

export interface RecentFile {
  type: 'file';
  /** File path */
  path: string;
  /** Display name (file name) */
  name: string;
  /** Last opened timestamp */
  lastOpened: string;
}

export type RecentItem = RecentWorkspace | RecentFolder | RecentFile;

interface RecentItemsData {
  workspaces: RecentWorkspace[];
  folders: RecentFolder[];
  files: RecentFile[];
}

const STORAGE_FILENAME = 'recent-items.json';
const MAX_WORKSPACES = 10;
const MAX_FOLDERS = 5;
const MAX_FILES = 20;

// Cache for the storage path
let cachedStoragePath: string | null = null;

/**
 * Get the default empty data structure
 */
function getEmptyData(): RecentItemsData {
  return {
    workspaces: [],
    folders: [],
    files: [],
  };
}

/**
 * Get the storage file path (cached)
 */
async function getStoragePath(): Promise<string> {
  if (cachedStoragePath) {
    return cachedStoragePath;
  }

  const configDir = await FsService.getAppConfigDir();
  cachedStoragePath = `${configDir}/${STORAGE_FILENAME}`;
  return cachedStoragePath;
}

/**
 * Load recent items from file system
 */
async function loadData(): Promise<RecentItemsData> {
  try {
    const storagePath = await getStoragePath();
    const exists = await FsService.checkExists(storagePath);

    if (!exists) {
      return getEmptyData();
    }

    const data = (await FsService.readJsonFile(
      storagePath,
    )) as Partial<RecentItemsData>;
    return {
      workspaces: Array.isArray(data.workspaces) ? data.workspaces : [],
      folders: Array.isArray(data.folders) ? data.folders : [],
      files: Array.isArray(data.files) ? data.files : [],
    };
  } catch {
    return getEmptyData();
  }
}

/**
 * Save recent items to file system
 */
async function saveData(data: RecentItemsData): Promise<void> {
  try {
    const storagePath = await getStoragePath();
    await FsService.writeJsonFile(storagePath, data);
  } catch (e) {
    console.error('Failed to save recent items:', e);
  }
}

/**
 * Update timestamp and move to front of list
 */
function touchItem<T extends RecentItem>(
  items: T[],
  path: string,
  createItem: () => T,
  maxItems: number,
): T[] {
  // Remove existing entry if present
  const filtered = items.filter((item) => item.path !== path);

  // Add new entry at the front
  const newItem = createItem();
  const result = [newItem, ...filtered];

  // Trim to max items
  return result.slice(0, maxItems);
}

/**
 * Check if the service is ready (Tauri runtime available)
 */
export async function isRecentItemsServiceReady(): Promise<boolean> {
  try {
    await getStoragePath();
    return true;
  } catch {
    return false;
  }
}

export const RecentItemsService = {
  /**
   * Get all recent items
   */
  async getAll(): Promise<RecentItemsData> {
    return loadData();
  },

  /**
   * Get recent workspaces (up to MAX_WORKSPACES)
   */
  async getWorkspaces(): Promise<RecentWorkspace[]> {
    return (await loadData()).workspaces;
  },

  /**
   * Get recent folders (up to MAX_FOLDERS)
   */
  async getFolders(): Promise<RecentFolder[]> {
    return (await loadData()).folders;
  },

  /**
   * Get recent files (up to MAX_FILES)
   */
  async getFiles(): Promise<RecentFile[]> {
    return (await loadData()).files;
  },

  /**
   * Add or update a workspace in recent items
   */
  async addWorkspace(path: string, name?: string): Promise<void> {
    const data = await loadData();
    const displayName = name || path.split('/').pop() || path;

    data.workspaces = touchItem(
      data.workspaces,
      path,
      () => ({
        type: 'workspace',
        path,
        name: displayName,
        lastOpened: new Date().toISOString(),
      }),
      MAX_WORKSPACES,
    );

    await saveData(data);
  },

  /**
   * Add or update a folder in recent items
   */
  async addFolder(path: string, name?: string): Promise<void> {
    const data = await loadData();
    const displayName = name || path.split('/').pop() || path;

    data.folders = touchItem(
      data.folders,
      path,
      () => ({
        type: 'folder',
        path,
        name: displayName,
        lastOpened: new Date().toISOString(),
      }),
      MAX_FOLDERS,
    );

    await saveData(data);
  },

  /**
   * Add or update a file in recent items
   */
  async addFile(path: string, name?: string): Promise<void> {
    const data = await loadData();
    const displayName = name || path.split('/').pop() || path;

    data.files = touchItem(
      data.files,
      path,
      () => ({
        type: 'file',
        path,
        name: displayName,
        lastOpened: new Date().toISOString(),
      }),
      MAX_FILES,
    );

    await saveData(data);
  },

  /**
   * Remove a specific item from recent items
   */
  async removeItem(type: RecentItemType, path: string): Promise<void> {
    const data = await loadData();

    switch (type) {
      case 'workspace':
        data.workspaces = data.workspaces.filter((w) => w.path !== path);
        break;
      case 'folder':
        data.folders = data.folders.filter((f) => f.path !== path);
        break;
      case 'file':
        data.files = data.files.filter((f) => f.path !== path);
        break;
    }

    await saveData(data);
  },

  /**
   * Clear all recent items
   */
  async clearAll(): Promise<void> {
    await saveData(getEmptyData());
  },

  /**
   * Clear all items of a specific type
   */
  async clearType(type: RecentItemType): Promise<void> {
    const data = await loadData();

    switch (type) {
      case 'workspace':
        data.workspaces = [];
        break;
      case 'folder':
        data.folders = [];
        break;
      case 'file':
        data.files = [];
        break;
    }

    await saveData(data);
  },
};
