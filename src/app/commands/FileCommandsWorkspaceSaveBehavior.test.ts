import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('file command workspace save wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'fileCommands.ts'), 'utf-8');

  it('routes save-as through workspace save dialog when a workspace is open', () => {
    expect(source).toContain('saveWorkspaceFileByDialog');
    expect(source).toContain("menuCommandBus.register('menu.file.save_workspace', async () => {");
    expect(source).toContain("menuCommandBus.register('menu.file.save_workspace_as', async () => {");
    expect(source).toContain('await saveWorkspaceFileByDialog();');
    expect(source).toContain('await saveCurrentWorkspace();');
  });
});
