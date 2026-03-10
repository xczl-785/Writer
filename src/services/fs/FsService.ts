import { invoke } from '@tauri-apps/api/core';
import type { FileNode } from '../../state/types';

export interface GitSyncStatus {
  isRepo: boolean;
  hasRemote: boolean;
  dirty: boolean;
  ahead: number;
  behind: number;
}

export interface EncodingStatus {
  label: string;
}

export interface FolderPathResult {
  path: string;
  nodes: FileNode[];
  error?: string;
}

export interface WorkspaceConfig {
  version: number;
  folders: Array<{ path: string; name?: string }>;
  state?: {
    openFiles?: string[];
    activeFile?: string;
    sidebarVisible?: boolean;
  };
}

export const FsService = {
  async listTree(path: string): Promise<FileNode[]> {
    return invoke('list_tree', { path });
  },
  
  async listTreeBatch(paths: string[]): Promise<FolderPathResult[]> {
    return invoke('list_tree_batch', { paths });
  },

  async readFile(path: string): Promise<string> {
    return invoke('read_file', { path });
  },

  async writeFileAtomic(path: string, content: string): Promise<void> {
    return invoke('write_file_atomic', { path, content });
  },
  
  async parseWorkspaceFile(path: string): Promise<WorkspaceConfig> {
    return invoke('parse_workspace_file', { path });
  },
  
  async saveWorkspaceFile(path: string, config: WorkspaceConfig): Promise<void> {
    return invoke('save_workspace_file', { path, config });
  },

  async createFile(path: string): Promise<void> {
    return invoke('create_file', { path });
  },

  async createDir(path: string): Promise<void> {
    return invoke('create_dir', { path });
  },

  async renameNode(oldPath: string, newPath: string): Promise<void> {
    return invoke('rename_node', { oldPath, newPath });
  },

  async deleteNode(path: string): Promise<void> {
    return invoke('delete_node', { path });
  },

  async revealInFileManager(path: string): Promise<void> {
    return invoke('reveal_in_file_manager', { path });
  },

  async saveImage(path: string, data: Uint8Array): Promise<void> {
    return invoke('save_image', { path, data });
  },

  async checkExists(path: string): Promise<boolean> {
    return invoke('check_exists', { path });
  },

  async getGitSyncStatus(path: string): Promise<GitSyncStatus> {
    return invoke('get_git_sync_status', { path });
  },

  async detectFileEncoding(path: string): Promise<EncodingStatus> {
    return invoke('detect_file_encoding', { path });
  },
};
