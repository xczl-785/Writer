import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('View menu typewriter behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const menuRs = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'src', 'menu.rs'),
    'utf-8',
  );
  const viewCommandsTs = readFileSync(
    join(currentDir, 'commands', 'viewCommands.ts'),
    'utf-8',
  );
  const messagesTs = readFileSync(join(currentDir, '..', 'i18n', 'messages.ts'), 'utf-8');

  it('renames view menu item to typewriter mode', () => {
    expect(menuRs).toContain('"menu.view.focus_mode"');
    expect(menuRs).toContain('"打字机模式"');
    expect(menuRs).toContain('"Typewriter Mode"');
  });

  it('wires focus_mode command to toggle typewriter preference', () => {
    expect(viewCommandsTs).toContain("menuCommandBus.register('menu.view.focus_mode'");
    expect(viewCommandsTs).toContain('typewriterEnabledByUser');
    expect(viewCommandsTs).toContain('setTypewriterEnabledByUser');
  });

  it('provides localized status feedback for typewriter toggles', () => {
    expect(messagesTs).toContain("'status.menu.typewriterOn'");
    expect(messagesTs).toContain("'status.menu.typewriterOff'");
  });
});

