import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor startup and history handling', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const editorTsxPath = join(currentDir, 'Editor.tsx');

  it('does NOT use invalid clearHistory command', () => {
    const editorTsx = readFileSync(editorTsxPath, 'utf-8');
    expect(editorTsx).not.toContain('editor.commands.clearHistory()');
  });

  it('uses accurate error message for content loading failures', () => {
    const editorTsx = readFileSync(editorTsxPath, 'utf-8');
    expect(editorTsx).toContain("'Failed to load editor content'");
  });

  it('has a favicon to prevent 404 noise', () => {
    // Check relative to project root (3 levels up from src/ui/editor)
    const faviconPath = join(
      currentDir,
      '..',
      '..',
      '..',
      'public',
      'favicon.ico',
    );
    expect(existsSync(faviconPath)).toBe(true);
  });
});
