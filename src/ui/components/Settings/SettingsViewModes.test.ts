import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Settings editor view modes', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const settingsTsx = readFileSync(
    join(currentDir, 'SettingsPanel.tsx'),
    'utf-8',
  );
  const appTsx = readFileSync(
    join(currentDir, '..', '..', '..', 'app', 'App.tsx'),
    'utf-8',
  );
  const messagesTs = readFileSync(
    join(currentDir, '..', '..', '..', 'shared', 'i18n', 'messages.ts'),
    'utf-8',
  );

  it('enables editor tab and exposes focus-zen toggle', () => {
    expect(settingsTsx).toContain("id: 'editor'");
    expect(settingsTsx).toContain('implemented: true');
    expect(settingsTsx).toContain("id: 'focus-zen-mode'");
    expect(settingsTsx).toContain('setFocusZenEnabledByUser');
  });

  it('keeps focus-zen setting synchronized with view mode state', () => {
    expect(appTsx).toContain('focusZenEnabledByUser');
    expect(appTsx).toContain('const applyFocusZen = useCallback');
    expect(appTsx).toContain('setFocusZenEnabledByUser');
    expect(appTsx).toContain('setFocusZen(focusZenEnabledByUser)');
    expect(appTsx).toContain('onSetFocusZen={applyFocusZen}');
  });

  it('ships localized copy for editor mode switches', () => {
    expect(messagesTs).toContain("'settings.editor.focusZen.label'");
    expect(messagesTs).toContain("'settings.editor.focusZen.desc'");
    expect(messagesTs).not.toContain("'settings.editor.typewriter.label'");
    expect(messagesTs).not.toContain("'settings.editor.typewriter.desc'");
  });
});
