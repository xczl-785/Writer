import { invoke } from '@tauri-apps/api/core';

const getGlobalObject = (): Record<string, unknown> =>
  globalThis as unknown as Record<string, unknown>;

const isTauriRuntime = (): boolean => {
  const g = getGlobalObject();
  return '__TAURI_INTERNALS__' in g || '__TAURI__' in g;
};

export async function readClipboardText(): Promise<string> {
  if (isTauriRuntime()) {
    return invoke<string>('read_clipboard_text');
  }

  if (navigator.clipboard?.readText) {
    return navigator.clipboard.readText();
  }

  throw new Error('Clipboard read unavailable');
}
