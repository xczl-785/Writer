import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor bubble menu timing', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readEditor = () =>
    readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

  it('keeps bubble menu debounce under 100ms', () => {
    const editorTsx = readEditor();

    expect(editorTsx).toContain('const BUBBLE_MENU_DEBOUNCE_MS = 80;');
    expect(editorTsx).toContain('setTimeout(() => {');
    expect(editorTsx).toContain('}, BUBBLE_MENU_DEBOUNCE_MS);');
  });
});
