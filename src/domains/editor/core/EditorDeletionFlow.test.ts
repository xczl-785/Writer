import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Deletion flow boundaries', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readEditor = () =>
    readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');
  const readSidebar = () =>
    readFileSync(
      join(currentDir, '..', '..', '..', 'ui', 'sidebar', 'Sidebar.tsx'),
      'utf-8',
    );

  it('uses confirm dialog in file-tree deletion path', () => {
    const sidebarTsx = readSidebar();

    expect(sidebarTsx).toContain(
      "import { showDeleteConfirmDialog } from '../components/Dialog';",
    );
    expect(sidebarTsx).toContain('await showDeleteConfirmDialog(');
  });

  it('does not invoke confirm dialog in editor content deletion flow', () => {
    const editorTsx = readEditor();

    expect(editorTsx).not.toContain('showDeleteConfirmDialog');
    expect(editorTsx).toContain("if (id.startsWith('delete'))");
    expect(editorTsx).toContain('setTransientStatus(`${action} deleted`)');
    expect(editorTsx).toContain('editor.chain().focus().undo().run()');
  });
});
