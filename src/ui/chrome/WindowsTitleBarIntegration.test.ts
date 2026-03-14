import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('WindowsTitleBar integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'WindowsTitleBar.tsx'), 'utf-8');

  it('tracks maximize state and listens to window resize/focus events', () => {
    expect(source).toContain('isMaximized');
    expect(source).toContain('data-window-maximized={isMaximized}');
    expect(source).toContain('data-window-focused={isWindowFocused}');
    expect(source).toContain('function BrandIcon()');
    expect(source).toContain('src="/icon.svg"');
    expect(source).toContain('isHeaderAwake: boolean;');
    expect(source).toContain(
      "isFocusZen && !isHeaderAwake ? 'opacity-0 pointer-events-none' : ''",
    );
    expect(source).toContain('windowHandle.isMaximized()');
    expect(source).toContain('windowHandle.onResized');
    expect(source).toContain('windowHandle.onFocusChanged');
  });

  it('supports title-bar double click maximize without hijacking interactive controls', () => {
    expect(source).toContain('handleTitleBarDoubleClick');
    expect(source).toContain('beginWindowDrag');
    expect(source).toContain('windowHandle.startDragging()');
    expect(source).toContain("closest('button')");
    expect(source).toContain('toggleMaximizeWindow');
    expect(source.match(/onMouseDown=\{beginWindowDrag\}/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});
