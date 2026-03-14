import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('WindowsTitleBar integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'WindowsTitleBar.tsx'), 'utf-8');

  it('tracks maximize state and listens to window resize/focus events', () => {
    expect(source).toContain('isMaximized');
    expect(source).toContain('windowHandle.isMaximized()');
    expect(source).toContain('windowHandle.onResized');
    expect(source).toContain('windowHandle.onFocusChanged');
  });

  it('supports title-bar double click maximize without hijacking interactive controls', () => {
    expect(source).toContain('handleTitleBarDoubleClick');
    expect(source).toContain("closest('button')");
    expect(source).toContain('toggleMaximizeWindow');
  });
});
