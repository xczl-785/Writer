import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('File menu reshape behavior markers', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const fileCommandsSource = readFileSync(
    join(currentDir, 'fileCommands.ts'),
    'utf-8',
  );

  it('registers file close separately from folder and workspace closing', () => {
    expect(fileCommandsSource).toContain(
      "menuCommandBus.register('menu.file.close_file'",
    );
    expect(fileCommandsSource).toContain(
      "menuCommandBus.register('menu.file.close_folder'",
    );
    expect(fileCommandsSource).toContain('removeFolderFromWorkspace');
  });

  it('does not route close-folder directly to closeWorkspace anymore', () => {
    const closeFolderRegistration = fileCommandsSource.match(
      /menuCommandBus\.register\('menu\.file\.close_folder'[\s\S]*?\),\n\s*\);/,
    );

    expect(closeFolderRegistration?.[0]).toBeDefined();
    expect(closeFolderRegistration?.[0]).toContain(
      'workspaceActions.removeFolderFromWorkspace',
    );
    expect(closeFolderRegistration?.[0]).not.toContain(
      'workspaceActions.closeWorkspace();',
    );
  });

  it('matches the prototype-driven file menu surface', () => {
    expect(fileCommandsSource).toContain(
      "menuCommandBus.register('menu.file.open_recent'",
    );
    expect(fileCommandsSource).toContain(
      "menuCommandBus.register('menu.file.exit'",
    );
    expect(fileCommandsSource).not.toContain(
      "menuCommandBus.register('menu.file.clear_recent'",
    );
  });
});
