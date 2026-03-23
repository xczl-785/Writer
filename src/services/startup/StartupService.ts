import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

const FILE_OPEN_EVENT = 'writer:file-open';

export async function getStartupFilePath(): Promise<string | null> {
  try {
    return await invoke<string | null>('get_startup_file_path');
  } catch (error) {
    console.error('Failed to get startup file path:', error);
    return null;
  }
}

export async function getPendingFilePath(): Promise<string | null> {
  try {
    return await invoke<string | null>('get_pending_file_path');
  } catch (error) {
    console.error('Failed to get pending file path:', error);
    return null;
  }
}

export type FileOpenListener = (filePath: string) => void;

export async function listenFileOpen(
  listener: FileOpenListener,
): Promise<UnlistenFn> {
  return listen<string>(FILE_OPEN_EVENT, (event) => {
    listener(event.payload);
  });
}

export async function getInitialFilePath(): Promise<string | null> {
  const startupPath = await getStartupFilePath();
  if (startupPath) {
    return startupPath;
  }
  return getPendingFilePath();
}
