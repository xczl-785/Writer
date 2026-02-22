import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor find and replace', () => {
  it('includes source markers for find-replace keyboard shortcuts', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain("'Mod-f'");
    expect(editorTsx).toContain("'Mod-h'");
  });

  it('includes source markers for find-replace accessible labels', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain('aria-label="Find"');
    expect(editorTsx).toContain('aria-label="Replace"');
    expect(editorTsx).toContain('aria-label="Previous match"');
    expect(editorTsx).toContain('aria-label="Next match"');
    expect(editorTsx).toContain('aria-label="Replace match"');
    expect(editorTsx).toContain('aria-label="Replace all matches"');
  });

  it('includes source markers for find-replace status and count strings', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain("'No matches'");
    expect(editorTsx).toContain("'Enter text to find'");
    expect(editorTsx).toContain('aria-label="Match count"');
    expect(editorTsx).toContain('aria-label="Match progress"');
    expect(editorTsx).toContain('FIND_MATCH_LIMIT = 1000');
    expect(editorTsx).toContain('`> ${FIND_MATCH_LIMIT - 1} matches`');
  });
});
