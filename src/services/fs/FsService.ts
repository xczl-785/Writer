import { invoke } from '@tauri-apps/api/core';
import type { FileNode } from '../../state/types';

export const FsService = {
  async listTree(path: string): Promise<FileNode[]> {
    return invoke('list_tree', { path });
  },

  async readFile(path: string): Promise<string> {
    return invoke('read_file', { path });
  },

  async writeFileAtomic(path: string, content: string): Promise<void> {
    return invoke('write_file_atomic', { path, content });
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

  async saveImage(path: string, data: Uint8Array): Promise<void> {
    return invoke('save_image', { path, data });
  },

  async checkExists(path: string): Promise<boolean> {
    return invoke('check_exists', { path });
  },
};
