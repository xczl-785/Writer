import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('App settings integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');
  const fileCommandsTs = readFileSync(
    join(currentDir, 'commands', 'fileCommands.ts'),
    'utf-8',
  );
  const messagesTs = readFileSync(
    join(currentDir, '..', 'i18n', 'messages.ts'),
    'utf-8',
  );
  const i18nIndexTs = readFileSync(
    join(currentDir, '..', 'i18n', 'index.ts'),
    'utf-8',
  );
  const appLibRs = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'src', 'lib.rs'),
    'utf-8',
  );
  const tauriMenuRs = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'src', 'menu.rs'),
    'utf-8',
  );

  it('adds native writer menu settings item at file menu tail', () => {
    expect(tauriMenuRs).toContain('"menu.file.settings"');
    expect(tauriMenuRs).toContain('"设置"');
    expect(tauriMenuRs).toContain('"Settings"');
  });

  it('registers file menu settings command and opens settings panel', () => {
    expect(fileCommandsTs).toContain(
      "menuCommandBus.register('menu.file.settings'",
    );
    expect(fileCommandsTs).toContain('onOpenSettings');
    expect(appTsx).toContain('<SettingsPanel');
    expect(appTsx).toContain("invoke('set_menu_locale'");
  });

  it('provides settings i18n keys and locale preference api', () => {
    expect(messagesTs).toContain("'settings.title'");
    expect(messagesTs).toContain("'settings.language'");
    expect(messagesTs).toContain("'settings.language.system'");
    expect(messagesTs).toContain("'settings.language.zhCN'");
    expect(messagesTs).toContain("'settings.language.enUS'");
    expect(i18nIndexTs).toContain('setLocalePreference');
    expect(i18nIndexTs).toContain('getLocalePreference');
    expect(appLibRs).toContain('fn set_menu_locale');
    expect(tauriMenuRs).toContain('build_native_menu_for_locale');
  });
});
