import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('App about integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');
  const commandsIndexTs = readFileSync(
    join(currentDir, 'commands', 'index.ts'),
    'utf-8',
  );
  const helpCommandsTs = readFileSync(
    join(currentDir, 'commands', 'helpCommands.ts'),
    'utf-8',
  );
  const aboutPanelTsx = readFileSync(
    join(currentDir, '..', 'ui', 'components', 'About', 'AboutWriterPanel.tsx'),
    'utf-8',
  );
  const messagesTs = readFileSync(
    join(currentDir, '..', 'shared', 'i18n', 'messages.ts'),
    'utf-8',
  );
  const tauriMenuRs = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'src', 'menu.rs'),
    'utf-8',
  );
  const tauriLibRs = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'src', 'lib.rs'),
    'utf-8',
  );
  const tauriConfigJson = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'tauri.conf.json'),
    'utf-8',
  );
  const tauriCapabilityJson = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'capabilities', 'default.json'),
    'utf-8',
  );
  const cargoToml = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'Cargo.toml'),
    'utf-8',
  );
  const packageJson = readFileSync(
    join(currentDir, '..', '..', 'package.json'),
    'utf-8',
  );
  const releaseWorkflow = readFileSync(
    join(currentDir, '..', '..', '.github', 'workflows', 'release.yml'),
    'utf-8',
  );

  it('registers help about command and mounts about panel from app state', () => {
    expect(commandsIndexTs).toContain('registerHelpCommands');
    expect(helpCommandsTs).toContain(
      "menuCommandBus.register('menu.help.about'",
    );
    expect(helpCommandsTs).toContain('onOpenAbout');
    expect(appTsx).toContain('isAboutOpen');
    expect(appTsx).toContain('openAbout');
    expect(appTsx).toContain('<AboutWriterPanel');
  });

  it('renders about content with writer icon and localized copy', () => {
    expect(aboutPanelTsx).toContain('src="/icon.svg"');
    expect(aboutPanelTsx).toContain('checkForAppUpdate');
    expect(aboutPanelTsx).toContain("t('aboutWriter.title')");
    expect(aboutPanelTsx).toContain("t('aboutWriter.currentVersion')");
    expect(aboutPanelTsx).toContain('getVersion()');
    expect(messagesTs).toContain("'aboutWriter.title'");
    expect(messagesTs).toContain("'aboutWriter.releaseNotes.title'");
    expect(messagesTs).toContain("'aboutWriter.documentation.title'");
    expect(messagesTs).toContain("'aboutWriter.updates.checkButton'");
  });

  it('keeps zh-CN help/about copy readable instead of question-mark mojibake', () => {
    expect(messagesTs).toContain("'menu.help': '\\u5e2e\\u52a9'");
    expect(messagesTs).toContain("'menu.help.about': '\\u5173\\u4e8e Writer'");
    expect(messagesTs).toContain("'aboutWriter.subtitle':");
    expect(messagesTs).toContain(
      '\\u672c\\u5730\\u4f18\\u5148\\u7684\\u8f7b\\u91cf Markdown \\u7f16\\u8f91\\u5668',
    );
    expect(messagesTs).toContain(
      "'aboutWriter.documentation.title': '\\u4f7f\\u7528\\u6587\\u6863'",
    );
    expect(messagesTs).not.toContain("'menu.help': '??'");
    expect(messagesTs).not.toContain(
      "'aboutWriter.subtitle': '??????? Markdown ???'",
    );
  });

  it('detects platform at runtime and keeps runtime platform copy dynamic', () => {
    expect(aboutPanelTsx).toContain('detectDesktopPlatform');
    expect(aboutPanelTsx).toContain('navigator.userAgent');
    expect(aboutPanelTsx).toContain("return 'Windows Desktop'");
    expect(aboutPanelTsx).toContain("return 'macOS Desktop'");
    expect(aboutPanelTsx).toContain("return 'Linux Desktop'");
    expect(aboutPanelTsx).toContain('about-writer-hero__icon-frame');
    expect(aboutPanelTsx).not.toContain("t('aboutWriter.platformValue')");
    expect(aboutPanelTsx).toContain("t('aboutWriter.environmentLine')");
  });

  it('enables native help about entry for windows menu', () => {
    expect(tauriMenuRs).toContain('"menu.help.about"');
    expect(tauriMenuRs).toContain('"About Writer"');
    expect(tauriMenuRs).toContain('true');
  });

  it('wires the official updater into the desktop app and release pipeline', () => {
    expect(packageJson).toContain('@tauri-apps/plugin-updater');
    expect(packageJson).toContain('@tauri-apps/plugin-opener');
    expect(cargoToml).toContain('tauri-plugin-updater');
    expect(cargoToml).toContain('tauri-plugin-opener');
    expect(tauriLibRs).toContain('tauri_plugin_updater::Builder');
    expect(tauriLibRs).toContain('tauri_plugin_opener::init()');
    expect(tauriConfigJson).toContain('"updater"');
    expect(tauriConfigJson).toContain('releases/latest/download/latest.json');
    expect(tauriCapabilityJson).toContain('updater:default');
    expect(tauriCapabilityJson).toContain('opener:default');
    expect(releaseWorkflow).toContain('TAURI_SIGNING_PRIVATE_KEY');
    expect(releaseWorkflow).toContain('TAURI_SIGNING_PRIVATE_KEY_PASSWORD');
    expect(releaseWorkflow).toContain('latest.json');
  });
});
