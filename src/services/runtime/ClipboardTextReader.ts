import { invoke } from '@tauri-apps/api/core';

export interface ClipboardPayload {
  html: string | null;
  text: string | null;
}

const getGlobalObject = (): Record<string, unknown> =>
  globalThis as unknown as Record<string, unknown>;

const isTauriRuntime = (): boolean => {
  const g = getGlobalObject();
  return '__TAURI_INTERNALS__' in g || '__TAURI__' in g;
};

async function readClipboardItemText(
  item: ClipboardItem,
  type: string,
): Promise<string | null> {
  if (!item.types.includes(type)) {
    return null;
  }

  const blob = await item.getType(type);
  return blob.text();
}

async function readBrowserClipboardPayload(): Promise<ClipboardPayload> {
  if (navigator.clipboard?.read) {
    const items = await navigator.clipboard.read();

    for (const item of items) {
      const html = await readClipboardItemText(item, 'text/html');
      const text = await readClipboardItemText(item, 'text/plain');
      if (html !== null || text !== null) {
        return { html, text };
      }
    }
  }

  if (navigator.clipboard?.readText) {
    return {
      html: null,
      text: await navigator.clipboard.readText(),
    };
  }

  throw new Error('Clipboard read unavailable');
}

export async function readClipboardPayload(): Promise<ClipboardPayload> {
  if (isTauriRuntime()) {
    return invoke<ClipboardPayload>('read_clipboard_payload');
  }

  return readBrowserClipboardPayload();
}
