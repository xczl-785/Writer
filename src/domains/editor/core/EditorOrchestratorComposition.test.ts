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

  it('keeps Tiptap instance wiring inside the shared single-document controller', () => {
    const implTsx = readFileSync(join(currentDir, 'EditorImpl.tsx'), 'utf-8');
    const sharedControllerTs = readFileSync(
      join(currentDir, 'useSingleDocumentEditorController.ts'),
      'utf-8',
    );
    const workspaceAdapterTs = readFileSync(
      join(currentDir, 'useEditorInstanceController.ts'),
      'utf-8',
    );

    expect(implTsx).toContain('useEditorInstanceController');
    expect(workspaceAdapterTs).toContain('useSingleDocumentEditorController');
    expect(workspaceAdapterTs).toContain('loadKey: activeFile');
    expect(sharedControllerTs).toContain('useEditor(');
    expect(sharedControllerTs).toContain('[loadKey]');
  });

  it('keeps Writer workspace persistence in the editor instance adapter', () => {
    const workspaceAdapterTs = readFileSync(
      join(currentDir, 'useEditorInstanceController.ts'),
      'utf-8',
    );

    expect(workspaceAdapterTs).toContain('updateFileContent(activeFile');
    expect(workspaceAdapterTs).toContain('setDirty(activeFile, true)');
    expect(workspaceAdapterTs).toContain('AutosaveService.schedule');
    expect(workspaceAdapterTs).toContain('flushEditorOnBlur(activeFile)');
  });

  it('keeps active file loads routed through loadDocument only', () => {
    const sharedControllerTs = readFileSync(
      join(currentDir, 'useSingleDocumentEditorController.ts'),
      'utf-8',
    );

    expect(sharedControllerTs).toContain('editor.commands.loadDocument(json)');
    expect(sharedControllerTs).toContain(
      'editor.commands.loadDocument(createPlainTextDocument(content))',
    );
    expect(sharedControllerTs).toContain('Failed to parse markdown content');
    expect(sharedControllerTs).not.toContain('editor.commands.setContent');
  });
});
