import { invoke } from '@tauri-apps/api/core';

export interface EncodingStatus {
  label: string;
}

export type PathKind = 'file' | 'directory' | 'missing' | 'other';

export async function readFile(path: string): Promise<string> {
  return invoke('read_file', { path });
}

export async function writeFileAtomic(
  path: string,
  content: string,
): Promise<void> {
  return invoke('write_file_atomic', { path, content });
}

export async function checkExists(path: string): Promise<boolean> {
  return invoke('check_exists', { path });
}

export async function getPathKind(path: string): Promise<PathKind> {
  return invoke('get_path_kind', { path });
}

export async function detectFileEncoding(
  path: string,
): Promise<EncodingStatus> {
  return invoke('detect_file_encoding', { path });
}

export async function getAppConfigDir(): Promise<string> {
  return invoke('get_app_config_dir');
}

export async function readJsonFile(path: string): Promise<unknown> {
  return invoke('read_json_file', { path });
}

export async function writeJsonFile(
  path: string,
  data: unknown,
): Promise<void> {
  return invoke('write_json_file', { path, data });
}
