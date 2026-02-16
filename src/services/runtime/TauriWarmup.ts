import { invoke } from '@tauri-apps/api/core';

let warmupPromise: Promise<void> | null = null;
let warmupScheduled = false;

const getGlobalObject = (): Record<string, unknown> =>
  globalThis as unknown as Record<string, unknown>;

const isTauriRuntime = (): boolean => {
  const g = getGlobalObject();
  return '__TAURI_INTERNALS__' in g || '__TAURI__' in g;
};

export const primeTauriBridge = async (): Promise<void> => {
  if (!isTauriRuntime()) {
    return;
  }

  if (!warmupPromise) {
    warmupPromise = invoke('greet', { name: 'warmup' })
      .then(() => undefined)
      .catch(() => undefined);
  }

  await warmupPromise;
};

export const scheduleTauriBridgeWarmup = (): void => {
  if (warmupScheduled) {
    return;
  }
  warmupScheduled = true;

  const run = () => {
    void primeTauriBridge();
  };

  const g = getGlobalObject() as {
    requestIdleCallback?: (
      cb: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
  };

  if (typeof g.requestIdleCallback === 'function') {
    g.requestIdleCallback(() => run(), { timeout: 1500 });
    return;
  }

  setTimeout(run, 250);
};

export const __resetWarmupForTests = (): void => {
  warmupPromise = null;
  warmupScheduled = false;
};
