import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('file command error notification wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'fileCommands.ts'), 'utf-8');

  it('routes command execution failures through level2 notifications', () => {
    expect(source).toContain('function showLevel2CommandError(');
    expect(source).toContain("level: 'level2'");
    expect(source).toContain("'menu-close-folder'");
    expect(source).toContain("'menu-save-file'");
  });
});
