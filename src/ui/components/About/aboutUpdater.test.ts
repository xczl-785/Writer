import { afterEach, describe, expect, it, vi } from 'vitest';
import { openReleasePage, resolveUpdaterTarget } from './aboutUpdater';

const mockOpenUrl = vi.fn();

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: (...args: unknown[]) => mockOpenUrl(...args),
}));

describe('aboutUpdater target resolution', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    mockOpenUrl.mockReset();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('prefers the NSIS updater target on Windows', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    expect(resolveUpdaterTarget()).toBe('windows-x86_64-nsis');
  });

  it('uses the default updater target on non-Windows platforms', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
      },
    });

    expect(resolveUpdaterTarget()).toBeUndefined();
  });

  it('opens the GitHub release page through the desktop opener plugin', async () => {
    await openReleasePage();

    expect(mockOpenUrl).toHaveBeenCalledWith(
      'https://github.com/xczl-785/Writer/releases/latest',
    );
  });
});
