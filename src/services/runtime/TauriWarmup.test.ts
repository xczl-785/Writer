import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

describe('TauriWarmup', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    delete (globalThis as unknown as Record<string, unknown>)
      .__TAURI_INTERNALS__;
    delete (globalThis as unknown as Record<string, unknown>).__TAURI__;
    delete (globalThis as unknown as Record<string, unknown>)
      .requestIdleCallback;
    vi.useRealTimers();
    vi.resetModules();
  });

  it('skips invoke outside tauri runtime', async () => {
    const mod = await import('./TauriWarmup');
    mod.__resetWarmupForTests();
    await mod.primeTauriBridge();

    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('invokes warmup only once in tauri runtime', async () => {
    (globalThis as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValue('ok');

    const mod = await import('./TauriWarmup');
    mod.__resetWarmupForTests();
    await mod.primeTauriBridge();
    await mod.primeTauriBridge();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('greet', { name: 'warmup' });
  });

  it('schedules warmup with requestIdleCallback when available', async () => {
    (globalThis as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValue('ok');
    const idleCallbackMock = vi.fn((cb: IdleRequestCallback) => {
      cb({
        didTimeout: false,
        timeRemaining: () => 16,
      } as IdleDeadline);
      return 1;
    });
    (
      globalThis as unknown as {
        requestIdleCallback: (cb: IdleRequestCallback) => number;
      }
    ).requestIdleCallback = idleCallbackMock;

    const mod = await import('./TauriWarmup');
    mod.__resetWarmupForTests();
    mod.scheduleTauriBridgeWarmup();

    expect(idleCallbackMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to setTimeout when requestIdleCallback is unavailable', async () => {
    (globalThis as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValue('ok');
    vi.useFakeTimers();

    const mod = await import('./TauriWarmup');
    mod.__resetWarmupForTests();
    mod.scheduleTauriBridgeWarmup();
    await vi.advanceTimersByTimeAsync(260);

    expect(invokeMock).toHaveBeenCalledTimes(1);
  });
});
