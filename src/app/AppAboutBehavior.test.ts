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

  it('enables native help about entry for windows menu', () => {
    expect(tauriMenuRs).toContain('"menu.help.about"');
    expect(tauriMenuRs).toContain('"About Writer"');
    expect(tauriMenuRs).toContain('true');
  });
});
