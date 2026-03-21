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
    expect(aboutPanelTsx).toContain("t('aboutWriter.title')");
    expect(aboutPanelTsx).toContain("t('aboutWriter.versionLabel')");
    expect(aboutPanelTsx).toContain('0.3.6');
    expect(messagesTs).toContain("'aboutWriter.title'");
    expect(messagesTs).toContain("'aboutWriter.releaseNotes.title'");
    expect(messagesTs).toContain("'aboutWriter.documentation.title'");
  });

  it('keeps zh-CN help/about copy readable instead of question-mark mojibake', () => {
    expect(messagesTs).toContain("'menu.help': '\\u5e2e\\u52a9'");
    expect(messagesTs).toContain("'menu.help.about': '\\u5173\\u4e8e Writer'");
    expect(messagesTs).toContain("'aboutWriter.subtitle':");
    expect(messagesTs).toContain(
      '\\u672c\\u5730\\u4f18\\u5148\\u7684\\u8f7b\\u91cf Markdown \\u7f16\\u8f91\\u5668',
    );
    expect(messagesTs).toContain(
      "'aboutWriter.buildInfo': '\\u6784\\u5efa\\u4fe1\\u606f'",
    );
    expect(messagesTs).not.toContain("'menu.help': '??'");
    expect(messagesTs).not.toContain(
      "'aboutWriter.subtitle': '??????? Markdown ???'",
    );
  });


  it('detects platform at runtime and uses a full-bleed icon presentation', () => {
    expect(aboutPanelTsx).toContain('detectDesktopPlatform');
    expect(aboutPanelTsx).toContain('navigator.userAgent');
    expect(aboutPanelTsx).toContain("return 'Windows Desktop'");
    expect(aboutPanelTsx).toContain("return 'macOS Desktop'");
    expect(aboutPanelTsx).toContain("return 'Linux Desktop'");
    expect(aboutPanelTsx).toContain('about-writer-hero__icon-frame');
    expect(aboutPanelTsx).not.toContain("t('aboutWriter.platformValue')");
  });

  it('enables native help about entry for windows menu', () => {
    expect(tauriMenuRs).toContain('"menu.help.about"');
    expect(tauriMenuRs).toContain('"About Writer"');
    expect(tauriMenuRs).toContain('true');
  });
});
