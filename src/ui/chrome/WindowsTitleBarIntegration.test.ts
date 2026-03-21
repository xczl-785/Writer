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
    expect(source).toContain('type { AppChromeModel }');
    expect(source).toContain('useSidebarToggleBehavior');
    expect(source).toContain(
      "!isVisible ? 'opacity-0 pointer-events-none' : ''",
    );
    expect(source).toContain('relative z-30 flex shrink-0');
    expect(source).toContain('windowHandle.isMaximized()');
    expect(source).toContain('.onResized(() => {');
    expect(source).toContain('.onFocusChanged((event) => {');
  });

  it('relies on tauri drag regions instead of manual title-bar gesture handlers', () => {
    expect(source).toContain('data-tauri-drag-region');
    expect(source).toContain('data-no-drag');
    expect(source).not.toContain('handleTitleBarDoubleClick');
    expect(source).not.toContain('beginWindowDrag');
    expect(source).not.toContain('windowHandle.startDragging()');
    expect(source).not.toContain('onDoubleClick={handleTitleBarDoubleClick}');
    expect(source).not.toMatch(/onMouseDown=\{beginWindowDrag\}/);
  });
});
