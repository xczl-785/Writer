import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Settings panel behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const settingsTsx = readFileSync(
    join(currentDir, 'SettingsPanel.tsx'),
    'utf-8',
  );
  const appCss = readFileSync(
    join(currentDir, '..', '..', '..', 'app', 'App.css'),
    'utf-8',
  );
  const messagesTs = readFileSync(
    join(currentDir, '..', '..', '..', 'i18n', 'messages.ts'),
    'utf-8',
  );

  it('models item states with active/coming-soon/disabled modes', () => {
    expect(settingsTsx).toContain("type SettingItemMode = 'active' | 'coming-soon' | 'disabled'");
    expect(settingsTsx).toContain("mode: 'coming-soon'");
    expect(settingsTsx).toContain("className={`settings-item ${");
  });

  it('keeps only language selector active in general settings', () => {
    expect(settingsTsx).toContain("id: 'language'");
    expect(settingsTsx).toContain("mode: 'active'");
    expect(settingsTsx).toContain("id: 'resume-session'");
    expect(settingsTsx).toContain("id: 'autosave'");
    expect(settingsTsx).not.toContain("id: 'default-path'");
  });

  it('uses placeholder panel for unimplemented tabs', () => {
    expect(settingsTsx).toContain('currentTab.implemented && activeRows ? (');
    expect(settingsTsx).toContain("t('settings.placeholder.title')");
    expect(settingsTsx).toContain("t('settings.placeholder.desc')");
  });

  it('uses updated language helper text copy', () => {
    expect(messagesTs).toContain("'settings.general.language.desc'");
    expect(messagesTs).toContain('设置更改后将于重新启动时生效');
  });

  it('applies prototype-like settings dialog layout styles', () => {
    expect(appCss).toContain('.settings-dialog');
    expect(appCss).toContain('width: min(640px, 90vw);');
    expect(appCss).toContain('height: min(480px, 85vh);');
    expect(appCss).toContain(".settings-overlay[data-viewport-tier='min']");
    expect(appCss).toContain('padding: 20px;');
    expect(appCss).toContain('box-shadow: none;');
    expect(appCss).toContain('.settings-sidebar');
    expect(appCss).toContain('.settings-tab.is-active .settings-tab__indicator');
    expect(appCss).toContain('.settings-placeholder');
    expect(settingsTsx).toContain("data-viewport-tier={viewportTier}");
  });
});
