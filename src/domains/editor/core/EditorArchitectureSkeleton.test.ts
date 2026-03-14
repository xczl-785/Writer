import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor architecture skeleton', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // currentDir is src/domains/editor/core/
  const editorDir = join(currentDir, '..'); // src/domains/editor/

  it('declares core modules for orchestrator/layout/state facade', () => {
    // Core modules are in the current directory (core/)
    expect(
      readFileSync(join(currentDir, 'EditorOrchestrator.tsx'), 'utf-8'),
    ).toContain('export');
    expect(
      readFileSync(join(currentDir, 'EditorLayoutModel.ts'), 'utf-8'),
    ).toContain('export');
    expect(
      readFileSync(join(currentDir, 'EditorStateFacade.ts'), 'utf-8'),
    ).toContain('export');
  });

  it('declares integration/domain and view modules', () => {
    // These are sibling directories to core/
    expect(
      readFileSync(join(editorDir, 'integration', 'index.ts'), 'utf-8'),
    ).toContain('export');
    expect(
      readFileSync(join(editorDir, 'domain', 'index.ts'), 'utf-8'),
    ).toContain('export');
    expect(
      readFileSync(join(editorDir, 'view', 'EditorView.tsx'), 'utf-8'),
    ).toContain('export');
  });
});
