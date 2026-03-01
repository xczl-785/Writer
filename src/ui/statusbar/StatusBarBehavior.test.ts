import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('StatusBar behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readStatusBar = () =>
    readFileSync(join(currentDir, 'StatusBar.tsx'), 'utf-8');
  const readStatusCss = () =>
    readFileSync(join(currentDir, 'StatusBar.css'), 'utf-8');

  it('keeps 5s fade-out contract for saved state', () => {
    const statusBarTsx = readStatusBar();
    const statusCss = readStatusCss();

    expect(statusBarTsx).toContain('5000 - (Date.now() - lastSavedAt)');
    expect(statusCss).toContain('.status-bar.fade .status-indicator');
    expect(statusCss).toContain('opacity: 0.3;');
  });

  it('uses transitions to avoid status flicker', () => {
    const statusCss = readStatusCss();

    expect(statusCss).toContain('transition: background-color 0.2s ease;');
    expect(statusCss).toContain(
      'transition: background-color 0.2s ease, opacity 0.5s ease;',
    );
  });
});
