import { invoke } from '@tauri-apps/api/core';
import type { FileNode } from '../../../state/types';

export interface EncodingStatus {
  label: string;
}

export type PathKind = 'file' | 'directory' | 'missing' | 'other';

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

/**
 * 复制文件结果
 */
export interface CopyFileResult {
  /** 实际写入的文件路径（处理自动重命名） */
  actualPath: string;
  /** 复制的字节数 */
  bytesWritten: number;
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

  async saveWorkspaceFile(
    path: string,
    config: WorkspaceConfig,
  ): Promise<void> {
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

  /**
   * 复制文件（返回实际写入路径）
   * @param source - 源文件路径
   * @param target - 目标路径
   * @returns 实际写入的文件路径（处理自动重命名）
   */
  async copyFileWithResult(
    source: string,
    target: string,
  ): Promise<CopyFileResult> {
    return invoke('copy_file_with_result', { source, target });
  },

  async getPathKind(path: string): Promise<PathKind> {
    return invoke('get_path_kind', { path });
  },

  async detectFileEncoding(path: string): Promise<EncodingStatus> {
    return invoke('detect_file_encoding', { path });
  },

  // App config directory operations
  async getAppConfigDir(): Promise<string> {
    return invoke('get_app_config_dir');
  },

  async readJsonFile(path: string): Promise<unknown> {
    return invoke('read_json_file', { path });
  },

  async writeJsonFile(path: string, data: unknown): Promise<void> {
    return invoke('write_json_file', { path, data });
  },
};
