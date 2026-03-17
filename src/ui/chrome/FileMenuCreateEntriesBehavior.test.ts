import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('File menu create entries', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'menuSchema.ts'), 'utf-8');

  it('exposes separate entries for new file and new folder', () => {
    expect(source).toContain("id: 'menu.file.new'");
    expect(source).toContain("labelKey: 'menu.file.new'");
    expect(source).toContain("id: 'menu.file.new_folder'");
    expect(source).toContain("labelKey: 'menu.file.newFolder'");
  });
});
