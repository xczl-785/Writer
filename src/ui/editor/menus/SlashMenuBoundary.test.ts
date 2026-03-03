import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSlashMenuLayout } from './SlashMenu';

describe('slash menu boundary layout', () => {
  it('flips up when bottom space is below 500 and top space is sufficient', () => {
    const layout = computeSlashMenuLayout({
      x: 320,
      y: 540,
      menuWidth: 260,
      menuHeight: 300,
      viewportWidth: 1280,
      viewportHeight: 900,
    });

    expect(layout.top).toBe(240);
  });

  it('clamps right overflow and keeps dropdown when top space is insufficient', () => {
    const layout = computeSlashMenuLayout({
      x: 960,
      y: 180,
      menuWidth: 260,
      menuHeight: 300,
      viewportWidth: 1000,
      viewportHeight: 600,
    });

    expect(layout.left).toBe(730);
    expect(layout.top).toBe(180);
  });

  it('uses 85vh max-height with inner scrolling in short viewport', () => {
    const layout = computeSlashMenuLayout({
      x: 50,
      y: 120,
      menuWidth: 260,
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
});
