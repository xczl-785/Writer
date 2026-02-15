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
};
