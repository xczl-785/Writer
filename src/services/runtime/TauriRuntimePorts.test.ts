import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe('TauriRuntimePorts', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockReset();
  });

  it('maps recovery file content helpers to existing Tauri commands', async () => {
    invokeMock.mockResolvedValue(undefined);
    const { tauriFileContentPort } = await import('./TauriRuntimePorts');

    await tauriFileContentPort.ensureDir?.('/app/recovery');
    await tauriFileContentPort.deleteFile?.('/app/recovery/drafts/d1.md');

    expect(invokeMock).toHaveBeenNthCalledWith(1, 'create_dir', {
      path: '/app/recovery',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, 'delete_node', {
      path: '/app/recovery/drafts/d1.md',
    });
  });

  it('treats an existing directory as an ensured directory', async () => {
    invokeMock.mockRejectedValue('Directory already exists: /app/recovery');
    const { tauriFileContentPort } = await import('./TauriRuntimePorts');

    await expect(
      tauriFileContentPort.ensureDir?.('/app/recovery'),
    ).resolves.toBeUndefined();
  });

  it('maps QuickWrite new-window runtime to the native command', async () => {
    invokeMock.mockResolvedValue(undefined);
    const { tauriQuickWriteWindowPort } = await import('./TauriRuntimePorts');

    await tauriQuickWriteWindowPort.openNewTemporaryDocumentWindow();

    expect(invokeMock).toHaveBeenCalledWith('open_quick_write_window');
  });

  it('maps QuickWrite PDF print runtime to the current webview print dialog', async () => {
    const print = vi.fn();
    Object.defineProperty(window, 'print', {
      configurable: true,
      value: print,
    });
    const { tauriQuickWritePrintPort } = await import('./TauriRuntimePorts');

    await tauriQuickWritePrintPort.printDocument();

    expect(print).toHaveBeenCalledTimes(1);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('maps startup and pending file queries to existing Tauri commands', async () => {
    invokeMock
      .mockResolvedValueOnce('/docs/startup.md')
      .mockResolvedValueOnce('/docs/pending.md');
    const { tauriStartupFilePort } = await import('./TauriRuntimePorts');

    await expect(tauriStartupFilePort.getStartupFilePath()).resolves.toBe(
      '/docs/startup.md',
    );
    await expect(tauriStartupFilePort.getPendingFilePath()).resolves.toBe(
      '/docs/pending.md',
    );

    expect(invokeMock).toHaveBeenNthCalledWith(1, 'get_startup_file_path');
    expect(invokeMock).toHaveBeenNthCalledWith(2, 'get_pending_file_path');
  });

  it('maps runtime file-open events to the startup file listener', async () => {
    const unlisten = vi.fn();
    listenMock.mockResolvedValue(unlisten);
    const { tauriStartupFilePort } = await import('./TauriRuntimePorts');
    const listener = vi.fn();

    await expect(tauriStartupFilePort.listenFileOpen(listener)).resolves.toBe(
      unlisten,
    );

    expect(listenMock).toHaveBeenCalledWith(
      'writer:file-open',
      expect.any(Function),
    );
    const handler = listenMock.mock.calls[0]?.[1] as (event: {
      payload: string;
    }) => void;
    handler({ payload: '/docs/opened.md' });
    expect(listener).toHaveBeenCalledWith('/docs/opened.md');
  });
});
