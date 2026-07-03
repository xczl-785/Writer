import { describe, expect, it } from 'vitest';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  collectSourceFiles,
  createImportBoundarySourceFile,
  importBoundarySpecifiers,
  normalizeImportPath,
  resolveRelativeImport,
} from '../../../test/importBoundaryUtils';

const currentDir = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(currentDir, '..', '..');
const quickWriteRoot = resolve(srcRoot, 'apps', 'quick-write');
const appRoot = resolve(srcRoot, 'app');
const appCommandsRoot = resolve(appRoot, 'commands');

const forbiddenPathPrefixes = [
  'app/',
  'domains/editor/core/',
  'domains/workspace/',
  'domains/file/',
  'ui/sidebar/',
  'ui/workspace/',
  'ui/components/RecentWorkspaces/',
  'ui/components/VirtualizedFileTree/',
  'services/autosave/AutosaveService',
  'domains/file/services/AutosaveService',
];

const forbiddenSymbols = new Set([
  'useWorkspaceStore',
  'workspaceActions',
  'WorkspaceManager',
  'RecentItemsService',
  'useFileTreeStore',
  'VirtualizedFileTree',
  'Sidebar',
  'App',
  'Editor',
  'EditorImpl',
  'EditorShell',
  'useEditorStateFacade',
]);

type ImportOffender = {
  file: string;
  specifier: string;
};

type SymbolOffender = ImportOffender & {
  symbol: string;
};

function projectRelativePath(
  fromFile: string,
  specifier: string,
): string | null {
  if (specifier.startsWith('.')) {
    const resolvedSpecifier = normalizeImportPath(
      resolve(resolveRelativeImport(fromFile, specifier)),
    );

    if (!resolvedSpecifier.startsWith(`${normalizeImportPath(srcRoot)}/`)) {
      return null;
    }

    return resolvedSpecifier.slice(normalizeImportPath(srcRoot).length + 1);
  }

  if (specifier.startsWith('src/')) {
    return specifier.slice('src/'.length);
  }

  if (specifier.startsWith('/src/')) {
    return specifier.slice('/src/'.length);
  }

  return null;
}

function isForbiddenPath(fromFile: string, specifier: string): boolean {
  const projectPath = projectRelativePath(fromFile, specifier);
  if (!projectPath) return false;

  return forbiddenPathPrefixes.some((prefix) => projectPath.startsWith(prefix));
}

function formatFile(root: string, file: string): string {
  return normalizeImportPath(relative(root, file));
}

function specifierMentionsForbiddenSymbol(
  specifier: string,
  symbol: string,
): boolean {
  const pathSegments = normalizeImportPath(specifier)
    .replace(/\.(c|m)?(t|j)sx?$/, '')
    .split('/');

  return pathSegments.includes(symbol);
}

function isExternalEditorTypeImport(
  sourceFile: ts.SourceFile,
  specifier: string,
  symbol: string,
): boolean {
  return (
    symbol === 'Editor' &&
    specifier === '@tiptap/react' &&
    hasTypeOnlyNamedImport(sourceFile, specifier, symbol)
  );
}

function hasTypeOnlyNamedImport(
  sourceFile: ts.SourceFile,
  specifier: string,
  symbol: string,
): boolean {
  return sourceFile.statements.some((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.importClause ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== specifier
    ) {
      return false;
    }

    const namedBindings = statement.importClause.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      return false;
    }

    return namedBindings.elements.some(
      (element) =>
        element.name.text === symbol &&
        (statement.importClause?.isTypeOnly || element.isTypeOnly),
    );
  });
}

describe('quick-write import boundary', () => {
  it('keeps QuickWrite production modules independent from Writer workspace app layers', () => {
    const offenders = collectSourceFiles(quickWriteRoot, {
      includeTests: false,
    }).flatMap((file): ImportOffender[] => {
      const sourceFile = createImportBoundarySourceFile(file);

      return importBoundarySpecifiers(sourceFile)
        .filter(({ specifier }) => isForbiddenPath(file, specifier))
        .map(({ specifier }) => ({
          file: formatFile(quickWriteRoot, file),
          specifier,
        }));
    });

    expect(offenders).toEqual([]);
  });

  it('keeps QuickWrite production imports free of workspace shell symbols', () => {
    const offenders = collectSourceFiles(quickWriteRoot, {
      includeTests: false,
    }).flatMap((file): SymbolOffender[] => {
      const sourceFile = createImportBoundarySourceFile(file);

      return importBoundarySpecifiers(sourceFile).flatMap(
        ({ specifier, importedNames }) => {
          const specifierOffenders = [...forbiddenSymbols].filter((symbol) =>
            specifierMentionsForbiddenSymbol(specifier, symbol),
          );
          const namedImportOffenders = importedNames.filter(
            (name) =>
              forbiddenSymbols.has(name) &&
              !isExternalEditorTypeImport(sourceFile, specifier, name),
          );

          return [
            ...new Set([...specifierOffenders, ...namedImportOffenders]),
          ].map((symbol) => ({
            file: formatFile(quickWriteRoot, file),
            specifier,
            symbol,
          }));
        },
      );
    });

    expect(offenders).toEqual([]);
  });

  it('keeps the Writer app shell and app commands from importing QuickWrite', () => {
    const appFiles = [
      join(appRoot, 'App.tsx'),
      ...collectSourceFiles(appCommandsRoot, { includeTests: false }),
    ];

    const offenders = appFiles.flatMap((file): ImportOffender[] => {
      const sourceFile = createImportBoundarySourceFile(file);

      return importBoundarySpecifiers(sourceFile)
        .filter(({ specifier }) => {
          const projectPath = projectRelativePath(file, specifier);
          return projectPath?.startsWith('apps/quick-write/') ?? false;
        })
        .map(({ specifier }) => ({
          file: formatFile(srcRoot, file),
          specifier,
        }));
    });

    expect(offenders).toEqual([]);
  });
});
