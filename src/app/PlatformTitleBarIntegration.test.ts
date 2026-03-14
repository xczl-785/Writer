import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('platform title bar integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');
  const appChromeTsx = readFileSync(join(currentDir, 'AppChrome.tsx'), 'utf-8');
  const chromeDir = join(currentDir, '..', 'ui', 'chrome');
  const menuSchemaPath = join(chromeDir, 'menuSchema.ts');
  const windowsTitleBarTsx = readFileSync(
    join(chromeDir, 'WindowsTitleBar.tsx'),
    'utf-8',
  );
  const platformTitleBarTsx = readFileSync(
    join(chromeDir, 'PlatformTitleBar.tsx'),
    'utf-8',
  );
  const chromeStateTs = readFileSync(
    join(chromeDir, 'chromeState.ts'),
    'utf-8',
  );

  it('renders a platform title bar above the shared app content', () => {
    expect(appTsx).toContain("import { AppChrome } from './AppChrome'");
    expect(appTsx).toContain('createAppChromeModel');
    expect(appTsx).toContain('<AppChrome chrome={chrome} />');
    expect(appChromeTsx).toContain('<PlatformTitleBar chrome={chrome} />');
    expect(platformTitleBarTsx).toContain('chrome: AppChromeModel;');
    expect(chromeStateTs).toContain('export type AppChromeModel');
    expect(chromeStateTs).toContain('createAppChromeModel');
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
