import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor architecture skeleton', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  it('declares core modules for orchestrator/layout/state facade', () => {
    const coreDir = join(currentDir, 'core');
    expect(
      readFileSync(join(coreDir, 'EditorOrchestrator.tsx'), 'utf-8'),
    ).toContain('export');
    expect(
      readFileSync(join(coreDir, 'EditorLayoutModel.ts'), 'utf-8'),
    ).toContain('export');
    expect(
      readFileSync(join(coreDir, 'EditorStateFacade.ts'), 'utf-8'),
    ).toContain('export');
  });

  it('declares integration/domain and view modules', () => {
    expect(
      readFileSync(join(currentDir, 'integration', 'index.ts'), 'utf-8'),
    ).toContain('export');
    expect(
      readFileSync(join(currentDir, 'domain', 'index.ts'), 'utf-8'),
    ).toContain('export');
    expect(
      readFileSync(join(currentDir, 'view', 'EditorView.tsx'), 'utf-8'),
    ).toContain('export');
  });
});
