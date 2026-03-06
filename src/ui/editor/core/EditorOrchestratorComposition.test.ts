import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor orchestrator composition', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  it('keeps orchestrator as the composition entry', () => {
    const orchestrator = readFileSync(
      join(currentDir, 'EditorOrchestrator.tsx'),
      'utf-8',
    );
    expect(orchestrator).toContain('forwardRef');
    expect(orchestrator).toContain('<Editor');
  });

  it('routes editor shell rendering through EditorView', () => {
    const editorTsx = readFileSync(join(currentDir, '..', 'Editor.tsx'), 'utf-8');
    const implTsx = readFileSync(
      join(currentDir, '..', 'EditorImpl.tsx'),
      'utf-8',
    );
    const viewTsx = readFileSync(
      join(currentDir, '..', 'view', 'EditorView.tsx'),
      'utf-8',
    );

    expect(editorTsx).toContain('<EditorOrchestrator');
    expect(implTsx).toContain('<EditorView');
    expect(viewTsx).toContain('<EditorShell');
  });
});
