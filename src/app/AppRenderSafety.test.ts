import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('App render safety', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');

  it('keeps toggleSidebar updater pure and moves zen updates outside setState updater', () => {
    expect(appTsx).not.toContain('setIsSidebarVisible((prev) => {');
    expect(appTsx).toContain(
      'const nextVisible = !sidebarVisibilityRef.current;',
    );
    expect(appTsx).toContain('setIsSidebarVisible(nextVisible);');
    expect(appTsx).toContain('if (nextVisible) {');
    expect(appTsx).toContain('exitZen();');
    expect(appTsx).toContain('enterZen(typewriterEnabledByUser);');
  });
});
