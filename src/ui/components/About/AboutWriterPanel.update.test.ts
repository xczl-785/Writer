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
  afterEach(() => {
    document.body.innerHTML = '';
    setLocale('en-US');
    mockGetVersion.mockReset();
    mockCheckForAppUpdate.mockReset();
    mockInstallAppUpdate.mockReset();
    mockOpenReleasePage.mockReset();
  });

  it('checks for updates and renders an update call to action when a release is available', async () => {
    setLocale('en-US');
    mockGetVersion.mockResolvedValue('0.3.11');
    mockCheckForAppUpdate.mockResolvedValue({
      kind: 'available',
      version: '0.4.0',
      currentVersion: '0.3.11',
      notes: 'New update summary',
      publishedAt: '2026-03-26T12:00:00Z',
      releaseUrl: 'https://github.com/xczl-785/Writer/releases/tag/v0.4.0',
    });

    const { container, root } = renderAboutPanel();

    const checkButton = getButton(container, 'Check for Updates');
    await act(async () => {
      checkButton.click();
      await Promise.resolve();
    });

    expect(mockCheckForAppUpdate).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Version 0.4.0 is ready');
    expect(container.textContent).toContain('New update summary');
    expect(getButton(container, 'Update Now')).toBeTruthy();

    await cleanup(container, root);
  });

  it('starts install and renders progress when the user confirms the update', async () => {
    setLocale('en-US');
    mockGetVersion.mockResolvedValue('0.3.11');
    mockCheckForAppUpdate.mockResolvedValue({
      kind: 'available',
      version: '0.4.0',
      currentVersion: '0.3.11',
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

    await act(async () => {
      getButton(container, 'Update Now').click();
      await Promise.resolve();
    });

    expect(mockInstallAppUpdate).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Downloading update...');
    expect(container.textContent).toContain('42%');

    await cleanup(container, root);
  });

  it('shows a fallback release-page action when the update check fails', async () => {
    setLocale('en-US');
    mockGetVersion.mockResolvedValue('0.3.11');
    mockCheckForAppUpdate.mockRejectedValue(new Error('network unavailable'));

    const { container, root } = renderAboutPanel();

    await act(async () => {
      getButton(container, 'Check for Updates').click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Unable to check for updates');

    await act(async () => {
      getButton(container, 'Open Release Page').click();
      await Promise.resolve();
    });

    expect(mockOpenReleasePage).toHaveBeenCalledTimes(1);
    await cleanup(container, root);
  });
});
