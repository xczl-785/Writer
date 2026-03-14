import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('platform title bar integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');
  const chromeDir = join(currentDir, '..', 'ui', 'chrome');
  const menuSchemaPath = join(chromeDir, 'menuSchema.ts');
  const windowsTitleBarTsx = readFileSync(
    join(chromeDir, 'WindowsTitleBar.tsx'),
    'utf-8',
  );

  it('renders a platform title bar above the shared app content', () => {
    expect(appTsx).toContain("import { PlatformTitleBar } from '../ui/chrome'");
    expect(appTsx).toContain('<PlatformTitleBar');
    expect(appTsx).toContain('isSidebarVisible={isSidebarVisible}');
    expect(appTsx).toContain('isFocusZen={isFocusZen}');
    expect(appTsx).toContain('isHeaderAwake={isHeaderAwake}');
    expect(appTsx).toContain('onToggleSidebar={toggleSidebar}');
    expect(appTsx).toContain('onSetFocusZen={applyFocusZen}');
  });

  it('defines a shared menu schema with windows-only tools and help groups', () => {
    expect(existsSync(menuSchemaPath)).toBe(true);
    const menuSchemaTs = readFileSync(menuSchemaPath, 'utf-8');

    expect(menuSchemaTs).toContain('export type MenuSchemaGroup');
    expect(menuSchemaTs).toContain("id: 'menu.file'");
    expect(menuSchemaTs).toContain("id: 'menu.edit'");
    expect(menuSchemaTs).toContain("id: 'menu.paragraph'");
    expect(menuSchemaTs).toContain("id: 'menu.format'");
    expect(menuSchemaTs).toContain("id: 'menu.view'");
    expect(menuSchemaTs).toContain("id: 'menu.tools'");
    expect(menuSchemaTs).toContain("id: 'menu.help'");
    expect(menuSchemaTs).toContain("platforms: ['windows']");
  });

  it('marks draggable title bar regions explicitly for tauri custom chrome', () => {
    expect(windowsTitleBarTsx).toContain('data-tauri-drag-region');
    expect(windowsTitleBarTsx).not.toContain('WebkitAppRegion');
  });
});
