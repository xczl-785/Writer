import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('viewport tier integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');

  it('consumes useViewportTier hook for responsive mode decisions', () => {
    expect(appTsx).toContain('useViewportTier');
    expect(appTsx).toContain('const { tier } = useViewportTier()');
  });
});

