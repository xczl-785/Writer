import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('window spec', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const tauriConfigRaw = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'tauri.conf.json'),
    'utf-8',
  );
  const tauriConfig = JSON.parse(tauriConfigRaw) as {
    app: { windows: Array<Record<string, number>> };
  };

  it('uses v5 default window size and min constraints', () => {
    const firstWindow = tauriConfig.app.windows[0];
    expect(firstWindow.width).toBe(1180);
    expect(firstWindow.height).toBe(800);
    expect(firstWindow.minWidth).toBe(640);
    expect(firstWindow.minHeight).toBe(480);
  });
});
