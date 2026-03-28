import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

describe('ClipboardTextReader', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    delete (globalThis as unknown as Record<string, unknown>)
      .__TAURI_INTERNALS__;
    delete (globalThis as unknown as Record<string, unknown>).__TAURI__;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: vi.fn(),
        readText: vi.fn(),
      },
    });
  });

  it('uses tauri clipboard command in desktop runtime', async () => {
    (globalThis as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValue({ html: '<b>desktop</b>', text: 'desktop' });
    const mod = await import('./ClipboardTextReader');

    await expect(mod.readClipboardPayload()).resolves.toEqual({
      html: '<b>desktop</b>',
      text: 'desktop',
    });
    expect(invokeMock).toHaveBeenCalledWith('read_clipboard_payload');
  });

  it('uses navigator clipboard rich payload outside tauri runtime', async () => {
    const read = vi.fn().mockResolvedValue([
      {
        types: ['text/html', 'text/plain'],
        getType: vi.fn(async (type: string) => {
          if (type === 'text/html') {
            return new Blob(['<p>browser</p>'], { type });
          }
          return new Blob(['browser'], { type });
        }),
      },
    ]);
    const readText = vi.fn().mockResolvedValue('browser text');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { read, readText },
    });
    const mod = await import('./ClipboardTextReader');

    await expect(mod.readClipboardPayload()).resolves.toEqual({
      html: '<p>browser</p>',
      text: 'browser',
    });
    expect(read).toHaveBeenCalledTimes(1);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('falls back to plain text when rich clipboard read is unavailable', async () => {
    const readText = vi.fn().mockResolvedValue('browser text');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });
    const mod = await import('./ClipboardTextReader');

    await expect(mod.readClipboardPayload()).resolves.toEqual({
      html: null,
      text: 'browser text',
    });
  });
});
