import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AboutWriterPanel } from './AboutWriterPanel';
import { setLocale } from '../../../shared/i18n';

const mockGetVersion = vi.fn();
const mockCheckForAppUpdate = vi.fn();
const mockInstallAppUpdate = vi.fn();
const mockOpenReleasePage = vi.fn();

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: () => mockGetVersion(),
}));

vi.mock('./aboutUpdater', () => ({
  checkForAppUpdate: () => mockCheckForAppUpdate(),
  installAppUpdate: (...args: unknown[]) => mockInstallAppUpdate(...args),
  openReleasePage: (...args: unknown[]) => mockOpenReleasePage(...args),
}));

function renderAboutPanel() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      createElement(AboutWriterPanel, {
        isOpen: true,
        onClose: vi.fn(),
      }),
    );
  });

  return { container, root };
}

function rerenderAboutPanel(root: Root) {
  act(() => {
    root.render(
      createElement(AboutWriterPanel, {
        isOpen: true,
        onClose: vi.fn(),
      }),
    );
  });
}

async function cleanup(container: HTMLElement, root: Root) {
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'));
  const match = buttons.find((button) => button.textContent?.trim() === label);
  if (!match) {
    throw new Error(`Unable to find button: ${label}\n${container.innerHTML}`);
  }
  return match as HTMLButtonElement;
}

describe('AboutWriterPanel updater behavior', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    document.body.innerHTML = '';
    setLocale('en-US');
    mockGetVersion.mockReset();
    mockCheckForAppUpdate.mockReset();
    mockInstallAppUpdate.mockReset();
    mockOpenReleasePage.mockReset();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('renders the simplified about layout with dynamic version and platform info', async () => {
    setLocale('en-US');
    mockGetVersion.mockResolvedValue('0.3.12');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const { container, root } = renderAboutPanel();

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Current version 0.3.12');
    expect(container.textContent).toContain('Tauri 2 + React 19');
    expect(container.textContent).toContain('Windows Desktop Environment');
    expect(container.textContent).toContain('Documentation');
    expect(container.textContent).toContain('Release Notes');
    expect(container.textContent).not.toContain('Build Info');
    expect(container.textContent).not.toContain('Positioning');
    expect(container.textContent).not.toContain('Open Release Page');

    await cleanup(container, root);
  });

  it('switches the main action into the available-update state and starts install from the same button', async () => {
    setLocale('en-US');
    mockGetVersion.mockResolvedValue('0.3.12');
    mockCheckForAppUpdate.mockResolvedValue({
      kind: 'available',
      version: '0.4.0',
      currentVersion: '0.3.12',
      notes: 'New update summary',
      publishedAt: '2026-03-26T12:00:00Z',
      releaseUrl: 'https://github.com/xczl-785/Writer/releases/tag/v0.4.0',
    });
    mockInstallAppUpdate.mockImplementation(
      async (
        _update: unknown,
        onProgress: (state: { phase: string; percent: number }) => void,
      ) => {
        onProgress({ phase: 'downloading', percent: 42 });
      },
    );

    const { container, root } = renderAboutPanel();

    await act(async () => {
      getButton(container, 'Check for Updates').click();
      await Promise.resolve();
    });

    expect(mockCheckForAppUpdate).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Update Available: v0.4.0');
    expect(container.textContent).not.toContain('New update summary');
    expect(container.textContent).not.toContain('Update Now');

    await act(async () => {
      getButton(container, 'Update Available: v0.4.0').click();
      await Promise.resolve();
    });

    expect(mockInstallAppUpdate).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Preparing Update...');
    expect(container.textContent).not.toContain('42%');

    await cleanup(container, root);
  });

  it('turns the main action into a manual download fallback when update checking fails', async () => {
    setLocale('en-US');
    mockGetVersion.mockResolvedValue('0.3.12');
    mockCheckForAppUpdate.mockRejectedValue(new Error('network unavailable'));

    const { container, root } = renderAboutPanel();

    await act(async () => {
      getButton(container, 'Check for Updates').click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Update check failed');
    expect(container.textContent).toContain('Download from Releases');

    await act(async () => {
      getButton(container, 'Download from Releases').click();
      await Promise.resolve();
    });

    expect(mockOpenReleasePage).toHaveBeenCalledTimes(1);

    await cleanup(container, root);
  });

  it('re-translates the error hint from the current locale on rerender', async () => {
    setLocale('zh-CN');
    mockGetVersion.mockResolvedValue('0.3.12');
    mockCheckForAppUpdate.mockRejectedValue(new Error('network unavailable'));

    const { container, root } = renderAboutPanel();

    await act(async () => {
      getButton(container, '检查更新').click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('检查更新失败');

    setLocale('en-US');
    rerenderAboutPanel(root);

    expect(container.textContent).toContain('Update check failed');
    expect(container.textContent).not.toContain('检查更新失败');

    await cleanup(container, root);
  });
});
