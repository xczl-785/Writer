import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('workspace file load fallback markers', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'workspaceActions.ts'), 'utf-8');

  it('falls back to per-folder tree loading when batch loading does not yield usable roots', () => {
    expect(source).toContain('const batchResultByPath = new Map(');
    expect(source).toContain('const fallbackNodes = await FsService.listTree(folder.path);');
    expect(source).toContain('if (rootFolders.length === 0 && failedFolderLoads.length > 0)');
  });
});
