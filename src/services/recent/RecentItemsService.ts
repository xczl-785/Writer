/**
 * Recent Items Storage Service
 *
 * Manages persistent storage of recently opened workspaces, folders, and files.
 * Uses localStorage for simplicity; could be migrated to Tauri's store plugin later.
 *
 * @see docs/current/阶段文档/V6-工作区功能需求文档.md - WS-09, WS-10
 * @see docs/current/阶段文档/V6-工作区交互设计规范.md - 2.5 最近项目菜单
 */

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

const STORAGE_KEY = 'writer-recent-items';
const MAX_WORKSPACES = 10;
const MAX_FOLDERS = 5;
const MAX_FILES = 20;

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
 * Load recent items from localStorage
 */
function loadData(): RecentItemsData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getEmptyData();

    const parsed = JSON.parse(stored) as Partial<RecentItemsData>;
    return {
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      files: Array.isArray(parsed.files) ? parsed.files : [],
    };
  } catch {
    return getEmptyData();
  }
}

/**
 * Save recent items to localStorage
 */
function saveData(data: RecentItemsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

export const RecentItemsService = {
  /**
   * Get all recent items
   */
  getAll(): RecentItemsData {
    return loadData();
  },

  /**
   * Get recent workspaces (up to MAX_WORKSPACES)
   */
  getWorkspaces(): RecentWorkspace[] {
    return loadData().workspaces;
  },

  /**
   * Get recent folders (up to MAX_FOLDERS)
   */
  getFolders(): RecentFolder[] {
    return loadData().folders;
  },

  /**
   * Get recent files (up to MAX_FILES)
   */
  getFiles(): RecentFile[] {
    return loadData().files;
  },

  /**
   * Add or update a workspace in recent items
   */
  addWorkspace(path: string, name?: string): void {
    const data = loadData();
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

    saveData(data);
  },

  /**
   * Add or update a folder in recent items
   */
  addFolder(path: string, name?: string): void {
    const data = loadData();
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

    saveData(data);
  },

  /**
   * Add or update a file in recent items
   */
  addFile(path: string, name?: string): void {
    const data = loadData();
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

    saveData(data);
  },

  /**
   * Remove a specific item from recent items
   */
  removeItem(type: RecentItemType, path: string): void {
    const data = loadData();

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

    saveData(data);
  },

  /**
   * Clear all recent items
   */
  clearAll(): void {
    saveData(getEmptyData());
  },

  /**
   * Clear all items of a specific type
   */
  clearType(type: RecentItemType): void {
    const data = loadData();

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

    saveData(data);
  },
};