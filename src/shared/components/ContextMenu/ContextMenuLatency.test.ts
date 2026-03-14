import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('ContextMenu latency contract', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  it('opens context menu synchronously without debounce delay', () => {
    const hookSrc = readFileSync(
      join(currentDir, 'useContextMenu.ts'),
      'utf-8',
    );

    expect(hookSrc).toContain('const open = useCallback');
    expect(hookSrc).toContain('setState({ isOpen: true, x, y, items });');
    expect(hookSrc).not.toContain('setTimeout(() => {\n    setState');
  });
});
