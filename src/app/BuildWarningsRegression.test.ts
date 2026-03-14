import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('build warning regression', () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const projectRoot = join(srcRoot, '..');

  it('keeps workspace persistence on static store imports', () => {
    const source = readFileSync(
      join(
        srcRoot,
        'domains',
        'workspace',
        'services',
        'WorkspaceStatePersistence.ts',
      ),
      'utf-8',
    );

    expect(source).toContain("useWorkspaceStore,");
    expect(source).not.toContain("await import('../state/workspaceStore')");
  });

  it('keeps vite chunk splitting configured for large vendor bundles', () => {
    const source = readFileSync(join(projectRoot, 'vite.config.ts'), 'utf-8');

    expect(source).toContain('manualChunks(id)');
    expect(source).toContain("return 'app-editor';");
    expect(source).toContain("return 'vendor-react';");
    expect(source).toContain("return 'vendor-tiptap';");
    expect(source).toContain("return 'vendor-tauri';");
    expect(source).toContain("return 'vendor-icons';");
  });
});
