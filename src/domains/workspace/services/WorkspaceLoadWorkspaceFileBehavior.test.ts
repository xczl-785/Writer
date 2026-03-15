import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('workspace file load fallback markers', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'workspaceActions.ts'),
    'utf-8',
  );

  it('falls back to per-folder tree loading when batch loading does not yield usable roots', () => {
    expect(source).toContain('const batchResultByPath = new Map(');
    expect(source).toContain(
      'const fallbackNodes = await FsService.listTree(folder.path);',
    );
    expect(source).toContain(
      'if (rootFolders.length === 0 && failedFolderLoads.length > 0)',
    );
  });

  it('derives workspace root display names from the folder basename instead of the full path', () => {
    expect(source).toContain('getBasename');
    expect(source).toContain('displayName: getBasename(path) || path');
    expect(source).toContain(
      'displayName: getBasename(folderPath) || folderPath',
    );
    expect(source).toContain(
      'displayName: folder.name || getBasename(folder.path) || folder.path',
    );
  });
});
