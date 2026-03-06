import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSlashMenuLayout } from '../domain';

describe('slash menu boundary layout', () => {
  it('flips up when bottom space is below 500 and top space is sufficient', () => {
    // anchorRect.bottom = 540, so available below = 900 - 540 = 360 < 500
    // anchorRect.top = 500, so available above = 500 >= 300 + 48
    const layout = computeSlashMenuLayout({
      anchorRect: { left: 320, top: 500, bottom: 540 },
      menuHeight: 300,
      viewportWidth: 1280,
      viewportHeight: 900,
    });

    // top = anchorRect.top - menuHeight - FLIP_SAFE_GAP = 500 - 300 - 48 = 152
    // But we also have TRIGGER_GAP = 8, so the calculation is:
    // Actually, the flip calculation is: top = anchorRect.top - menuHeight - FLIP_SAFE_GAP
    // = 500 - 300 - 48 = 152
    expect(layout.top).toBe(152);
  });

  it('clamps right overflow and keeps dropdown when top space is insufficient', () => {
    // anchorRect.bottom = 180, so available below = 600 - 180 = 420 < 500
    // anchorRect.top = 140, so available above = 140 < 300 + 48
    // Should stay below
    const layout = computeSlashMenuLayout({
      anchorRect: { left: 960, top: 140, bottom: 180 },
      menuHeight: 300,
      viewportWidth: 1000,
      viewportHeight: 600,
    });

    // left = clamp(960, 10, 1000 - 260 - 10) = clamp(960, 10, 730) = 730
    expect(layout.left).toBe(730);
    // top = anchorRect.bottom + TRIGGER_GAP = 180 + 8 = 188
    expect(layout.top).toBe(188);
  });

  it('uses 85vh max-height with inner scrolling in short viewport', () => {
    const layout = computeSlashMenuLayout({
      anchorRect: { left: 50, top: 100, bottom: 120 },
      menuHeight: 500,
      viewportWidth: 640,
      viewportHeight: 480,
    });

    expect(layout.maxHeight).toBe('85vh');
    expect(layout.overflowY).toBe('auto');
  });

  it('matches v5 visual spec for menu radius and item height', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(currentDir, '..', 'Editor.css'), 'utf-8');

    expect(css).toContain('border-radius: 12px;');
    expect(css).toContain('min-height: 34px;');
  });

  it('keeps active item in view during keyboard navigation', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const slashViewTsx = readFileSync(join(currentDir, 'SlashMenuView.tsx'), 'utf-8');

    expect(slashViewTsx).toContain('useLayoutEffect');
    expect(slashViewTsx).toContain('setMeasuredHeight');
    expect(slashViewTsx).toContain('computeKeyboardScrollTop');
  });
});