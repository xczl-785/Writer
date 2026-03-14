import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('App folder-drop wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');

  it('routes empty-state and editor drops through folder-only classification before workspace handling', () => {
    expect(source).toContain('getCurrentWindow().onDragDropEvent');
    expect(source).toContain('classifyDroppedPaths(');
    expect(source).toContain('FsService.getPathKind');
    expect(source).toContain("setStatus('error', t('workspace.dragFoldersOnly'))");
    expect(source).toContain("setStatus('error', t('workspace.dropInEditorDisabled'))");
    expect(source).toContain('setIsEditorDropBlocked(hasWorkspace && !sidebarTarget && mainTarget);');
    expect(source).toContain('openInNewWorkspace: true');
    expect(source).toContain('isExternalDragOver={isSidebarDragOver}');
    expect(source).toContain('isDragOver={isEditorDragOver}');
    expect(source).toContain("import { EditorDropBlockedOverlay } from '../ui/components/ErrorStates'");
    expect(source).toContain('<EditorDropBlockedOverlay');
    expect(source).not.toContain("t('workspace.dropBlockedTitle')");
    expect(source).not.toContain('WORKSPACE ONLY');
  });
});
