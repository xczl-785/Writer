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
    // Editor.tsx, EditorImpl.tsx are in the same directory (core/)
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');
    const implTsx = readFileSync(join(currentDir, 'EditorImpl.tsx'), 'utf-8');
    // view/ is a sibling directory to core/
    const viewTsx = readFileSync(
      join(currentDir, '..', 'view', 'EditorView.tsx'),
      'utf-8',
    );

    expect(editorTsx).toContain('<EditorOrchestrator');
    expect(implTsx).toContain('<EditorView');
    expect(viewTsx).toContain('<EditorShell');
  });

  it('keeps Tiptap instance wiring inside the editor instance controller', () => {
    const implTsx = readFileSync(join(currentDir, 'EditorImpl.tsx'), 'utf-8');
    const controllerTs = readFileSync(
      join(currentDir, 'useEditorInstanceController.ts'),
      'utf-8',
    );

    expect(implTsx).toContain('useEditorInstanceController');
    expect(controllerTs).toContain('useEditor(');
    expect(controllerTs).toContain('[activeFile]');
  });

  it('keeps active file loads routed through loadDocument only', () => {
    const controllerTs = readFileSync(
      join(currentDir, 'useEditorInstanceController.ts'),
      'utf-8',
    );

    expect(controllerTs).toContain('editor.commands.loadDocument(json)');
    expect(controllerTs).toContain('editor.commands.loadDocument({');
    expect(controllerTs).not.toContain('editor.commands.setContent');
  });
});
