import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  createImportBoundarySourceFile,
  importBoundarySpecifiers,
  normalizeImportPath,
  resolveRelativeImport,
} from '../../../test/importBoundaryUtils';

const currentDir = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(currentDir, '..', '..');

const readQuickWriteSource = (fileName: string): string =>
  readFileSync(join(currentDir, fileName), 'utf-8');

function collectRelativeImportGraph(entryFile: string): string[] {
  const visited = new Set<string>();
  const pending = [entryFile];

  while (pending.length > 0) {
    const file = pending.pop();
    if (!file) continue;

    const normalizedFile = normalizeImportPath(file);
    if (visited.has(normalizedFile)) continue;
    visited.add(normalizedFile);

    const sourceFile = createImportBoundarySourceFile(file);
    for (const { specifier } of importBoundarySpecifiers(sourceFile)) {
      if (!specifier.startsWith('.')) continue;
      const resolvedImport = resolve(resolveRelativeImport(file, specifier));
      const normalizedImport = normalizeImportPath(resolvedImport);
      if (!normalizedImport.startsWith(`${normalizeImportPath(srcRoot)}/`)) {
        continue;
      }
      if (/\.test\.tsx?$/.test(normalizedImport)) {
        continue;
      }
      pending.push(resolvedImport);
    }
  }

  return [...visited].map((file) =>
    normalizeImportPath(relative(srcRoot, file)),
  );
}

describe('QuickWrite architecture', () => {
  it('renders through the shared Writer single-document editor adapter', () => {
    const source = readQuickWriteSource('QuickWriteEditor.tsx');

    expect(source).toContain('SingleDocumentEditor');
    expect(source).toContain('SingleDocumentEditorHandle');
    expect(source).toContain('onMarkdownChange');
    expect(source).not.toContain('useEditor(');
    expect(source).not.toContain('<textarea');
    expect(source).not.toContain('document.execCommand');
  });

  it('uses Writer menu schema, shared menu renderer, and menuCommandBus', () => {
    const source = readQuickWriteSource('QuickWriteMenuAdapter.tsx');

    expect(source).toContain('WINDOWS_MENU_SCHEMA');
    expect(source).toContain('SchemaMenuBar');
    expect(source).toContain('menuCommandBus.register');
    expect(source).toContain("'menu.file.save_to'");
    expect(source).toContain("'保存到…'");
    expect(source).not.toContain("'menu.file.export_html'");
    expect(source).not.toContain("'menu.file.print_to_pdf'");
    expect(source).not.toContain('menu.quick_write.export_html');
    expect(source).not.toContain('menu.quick_write.print_to_pdf');
    expect(source).not.toContain('RecentItemsService');
    expect(source).not.toContain('useWorkspaceStore');
    expect(source).not.toContain('useFileTreeStore');
    expect(source).not.toContain('Sidebar');
  });

  it('uses a QuickWrite-owned shell around shared Writer chrome without app-shell coupling', () => {
    const appSource = readQuickWriteSource('QuickWriteApp.tsx');
    const shellSource = readQuickWriteSource('QuickWriteAppShell.tsx');

    expect(shellSource).toContain("from '../../ui/chrome'");
    expect(shellSource).toContain('PlatformTitleBar');
    expect(shellSource).toContain('quick-write-app-body');
    expect(shellSource).toContain('quick-write-document-surface');
    expect(appSource).toContain('createAppChromeModel');
    expect(appSource).toContain('showSidebarToggle: false');
    expect(appSource).toContain('<QuickWriteAppShell');
    expect(appSource).toContain('<QuickWriteMenuAdapter');
    expect(appSource).toContain('<QuickWriteStatusBar');
    expect(appSource).not.toContain('PlatformTitleBar');
    expect(appSource).not.toContain('<StatusBarView');
    expect(appSource).not.toContain("from '../../ui/statusbar/StatusBar'");
    expect(appSource).not.toContain('useWorkspaceStore');
    expect(appSource).not.toContain('RecentItemsService');
    expect(shellSource).not.toContain("from '../../app/");
    expect(shellSource).not.toContain('useWorkspaceStore');
    expect(shellSource).not.toContain('RecentItemsService');
  });

  it('uses a QuickWrite status adapter over the shared status bar view', () => {
    const source = readQuickWriteSource('QuickWriteStatusBar.tsx');

    expect(source).toContain("from '../../ui/statusbar/StatusBarView'");
    expect(source).toContain('StatusBarView');
    expect(source).not.toContain('quick-write-shared-status-bar');
    expect(source).not.toContain('showMessage={false}');
    expect(source).not.toContain("from '../../ui/statusbar/StatusBar'");
    expect(source).not.toContain('useWorkspaceStore');
    expect(source).not.toContain('useEditorStore');
    expect(source).not.toContain('RecentItemsService');
  });

  it('keeps the QuickWrite shared editor import graph away from workspace image actions', () => {
    const graph = collectRelativeImportGraph(
      join(currentDir, 'QuickWriteEditor.tsx'),
    );

    expect(graph).toContain('apps/quick-write/QuickWriteEditor.tsx');
    expect(graph).toContain('domains/editor/core/SingleDocumentEditor.tsx');
    expect(graph).toContain('domains/editor/ui/menus/useSlashMenu.ts');
    expect(
      graph.filter(
        (file) =>
          file === 'domains/editor/hooks/imageActions.ts' ||
          file === 'domains/workspace/state/workspaceStore.ts',
      ),
    ).toEqual([]);
  });

  it('keeps rejected QuickWrite editor and menu copies out of the main path', () => {
    expect(existsSync(join(currentDir, 'QuickWriteRichEditor.tsx'))).toBe(
      false,
    );
    expect(existsSync(join(currentDir, 'quickWriteMenu.ts'))).toBe(false);
    expect(existsSync(join(currentDir, 'QuickWriteMenuBar.tsx'))).toBe(false);
  });
});
