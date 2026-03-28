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
        readText: vi.fn(),
      },
    });
  });

  it('uses tauri clipboard command in desktop runtime', async () => {
    (globalThis as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValue('desktop text');
    const mod = await import('./ClipboardTextReader');

    await expect(mod.readClipboardText()).resolves.toBe('desktop text');
    expect(invokeMock).toHaveBeenCalledWith('read_clipboard_text');
  });

  it('uses navigator clipboard outside tauri runtime', async () => {
    const readText = vi.fn().mockResolvedValue('browser text');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });
    const mod = await import('./ClipboardTextReader');

    await expect(mod.readClipboardText()).resolves.toBe('browser text');
    expect(readText).toHaveBeenCalledTimes(1);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
