import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('native file menu workspace items', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'menu.rs'), 'utf-8');

  it('includes dedicated workspace save commands in the file menu', () => {
    expect(source).toContain('"menu.file.save_workspace"');
    expect(source).toContain('"保存工作区"');
    expect(source).toContain('"menu.file.save_workspace_as"');
    expect(source).toContain('"工作区另存为..."');
  });
});
