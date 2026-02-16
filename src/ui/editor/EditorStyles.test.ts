import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor list styles', () => {
  it('defines bullet list markers for unordered lists', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(currentDir, 'Editor.css'), 'utf-8');

    expect(css).toMatch(/\.ProseMirror ul[\s\S]*list-style-type:\s*disc/i);
  });
});
