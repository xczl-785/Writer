import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FORBIDDEN_CORE_EDITOR_REFERENCES =
  /services\/error|ErrorService|services\/images|ImageResolver|state\/slices|workspaceStore|fileStore|RecentItems|Sidebar|FileTree|StatusBar|WorkspaceManager|workspaceActions|AutosaveService|statusSlice|notificationSlice/;

function collectFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(path);
    return entry.isFile() && path.endsWith('.ts') ? [path] : [];
  });
}

describe('editor-core boundary', () => {
  it('does not import Writer shell, state, error, image, or workspace services', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const coreEditorDir = join(currentDir, '../../../core/editor');
    const offenders = collectFiles(coreEditorDir).filter((path) =>
      FORBIDDEN_CORE_EDITOR_REFERENCES.test(readFileSync(path, 'utf-8')),
    );

    expect(offenders).toEqual([]);
  });
});
