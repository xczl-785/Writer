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
const projectRoot = resolve(srcRoot, '..');
const manifestPath = join(projectRoot, 'quick-write.project.json');
const quickWriteProductionFiles = [
  'QuickWriteApp.tsx',
  'QuickWriteAppShell.tsx',
  'QuickWriteEditor.tsx',
  'QuickWriteMenuAdapter.tsx',
  'QuickWriteStatusBar.tsx',
];

const readQuickWriteSource = (fileName: string): string =>
  readFileSync(join(currentDir, fileName), 'utf-8');

const readQuickWriteProductionSources = (): Record<string, string> =>
  Object.fromEntries(
    quickWriteProductionFiles.map((fileName) => [
      fileName,
      readQuickWriteSource(fileName),
    ]),
  );

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
  it('records UI fidelity ownership without classifying Writer product UI as core', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      uiFidelityBaseline?: {
        classificationValues?: string[];
        classificationMatrix?: Record<
          string,
          { classification?: string; paths?: string[] }
        >;
      };
    };
    const values = new Set(
      manifest.uiFidelityBaseline?.classificationValues ?? [],
    );
    const matrix = manifest.uiFidelityBaseline?.classificationMatrix ?? {};
    const requiredObjects = [
      'QuickWriteAppShell',
      'QuickWriteEditor',
      'QuickWriteMenuAdapter',
      'QuickWriteStatusBar',
      'SchemaMenuBar',
      'StatusBarView',
      'SettingsPanel',
      'PlatformTitleBar',
      'TitleBar',
      'SingleDocumentEditor',
    ];
    const writerProductUiObjects = [
      'SchemaMenuBar',
      'StatusBarView',
      'SettingsPanel',
      'PlatformTitleBar',
      'TitleBar',
      'SingleDocumentEditor',
    ];

    expect([...values]).toEqual(
      expect.arrayContaining([
        'core',
        'quickwrite-copy',
        'adapter',
        'writer-retain',
        'later-decision',
      ]),
    );
    expect(Object.keys(matrix)).toEqual(expect.arrayContaining(requiredObjects));
    for (const objectName of requiredObjects) {
      expect(values.has(matrix[objectName]?.classification ?? '')).toBe(true);
      expect(matrix[objectName]?.paths?.length).toBeGreaterThan(0);
    }
    for (const objectName of writerProductUiObjects) {
      expect(matrix[objectName]?.classification).not.toBe('core');
    }
  });

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

  it('keeps titlebar, menu, editor, settings, and status paths on retained structure', () => {
    const appSource = readQuickWriteSource('QuickWriteApp.tsx');
    const shellSource = readQuickWriteSource('QuickWriteAppShell.tsx');
    const editorSource = readQuickWriteSource('QuickWriteEditor.tsx');
    const menuSource = readQuickWriteSource('QuickWriteMenuAdapter.tsx');
    const statusSource = readQuickWriteSource('QuickWriteStatusBar.tsx');

    expect(shellSource).toContain('<PlatformTitleBar');
    expect(appSource).toContain('<QuickWriteMenuAdapter');
    expect(appSource).toContain('<QuickWriteEditor');
    expect(appSource).toContain('<QuickWriteStatusBar');
    expect(appSource).toContain('<SettingsPanel');
    expect(editorSource).toContain('<SingleDocumentEditor');
    expect(menuSource).toContain('<SchemaMenuBar');
    expect(statusSource).toContain('<StatusBarView');
  });

  it('does not introduce local QuickWrite titlebar, nav, document chrome, footer status, or editor implementations', () => {
    const sources = readQuickWriteProductionSources();
    const combinedSource = Object.values(sources).join('\n');

    expect(combinedSource).not.toContain('QuickWriteTitleBar');
    expect(combinedSource).not.toContain('QuickWriteNav');
    expect(combinedSource).not.toContain('QuickWriteDocumentHeader');
    expect(combinedSource).not.toContain('QuickWriteDocumentFooter');
    expect(combinedSource).not.toContain('QuickWriteFooterStatusBar');
    expect(combinedSource).not.toContain('quick-write-nav');
    expect(combinedSource).not.toContain('quick-write-document-header');
    expect(combinedSource).not.toContain('quick-write-document-footer');
    expect(combinedSource).not.toContain('quick-write-footer-status');
    expect(combinedSource).not.toContain('<textarea');
    expect(combinedSource).not.toContain('useEditor(');
    expect(combinedSource).not.toContain('document.execCommand');
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
