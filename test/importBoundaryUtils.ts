import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import ts from 'typescript';

export type ImportBoundarySpecifier = {
  specifier: string;
  importedNames: string[];
};

export function collectSourceFiles(
  dir: string,
  options: { includeTests?: boolean } = {},
): string[] {
  const includeTests = options.includeTests ?? true;

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path, options);
    if (!entry.isFile()) return [];
    if (!['.ts', '.tsx'].includes(extname(entry.name))) return [];
    if (!includeTests && /\.test\.tsx?$/.test(entry.name)) return [];
    return [path];
  });
}

export function createImportBoundarySourceFile(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(file, 'utf-8'),
    ts.ScriptTarget.Latest,
    true,
  );
}

export function moduleSpecifiers(source: ts.SourceFile): string[] {
  return importBoundarySpecifiers(source).map(({ specifier }) => specifier);
}

export function importBoundarySpecifiers(
  source: ts.SourceFile,
): ImportBoundarySpecifier[] {
  const specifiers: ImportBoundarySpecifier[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push({
        specifier: node.moduleSpecifier.text,
        importedNames: importClauseNames(node.importClause),
      });
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push({
        specifier: node.moduleSpecifier.text,
        importedNames: exportClauseNames(node.exportClause),
      });
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1
    ) {
      const [specifier] = node.arguments;
      if (specifier && ts.isStringLiteral(specifier)) {
        specifiers.push({
          specifier: specifier.text,
          importedNames: [],
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return specifiers;
}

export function resolveRelativeImport(
  fromFile: string,
  specifier: string,
): string {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ];

  return (
    candidates.find((candidate) => {
      try {
        return statSync(candidate).isFile();
      } catch {
        return false;
      }
    }) ?? base
  );
}

export function normalizeImportPath(path: string): string {
  return normalize(path).replaceAll('\\', '/');
}

function importClauseNames(clause: ts.ImportClause | undefined): string[] {
  if (!clause) return [];

  const names: string[] = [];
  if (clause.name) names.push(clause.name.text);

  const namedBindings = clause.namedBindings;
  if (namedBindings && ts.isNamespaceImport(namedBindings)) {
    names.push(namedBindings.name.text);
  }

  if (namedBindings && ts.isNamedImports(namedBindings)) {
    namedBindings.elements.forEach((element) => {
      names.push(element.name.text);
      if (element.propertyName) names.push(element.propertyName.text);
    });
  }

  return names;
}

function exportClauseNames(
  clause: ts.NamedExportBindings | undefined,
): string[] {
  if (!clause) return [];

  if (ts.isNamespaceExport(clause)) {
    return [clause.name.text];
  }

  return clause.elements.flatMap((element) => [
    element.name.text,
    ...(element.propertyName ? [element.propertyName.text] : []),
  ]);
}
