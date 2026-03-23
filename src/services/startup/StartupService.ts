import { invoke } from '@tauri-apps/api/core';

/**
 * 获取启动时传入的文件路径
 *
 * 当用户双击文件关联的文件时，系统会将文件路径作为命令行参数传递
 * 此函数从 Rust 后端获取该参数
 *
 * @returns 文件路径，如果没有则返回 null
 */
export async function getStartupFilePath(): Promise<string | null> {
  try {
    return await invoke<string | null>('get_startup_file_path');
  } catch (error) {
    console.error('Failed to get startup file path:', error);
    return null;
  }
}
