import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const currentDir = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(currentDir, '..');
const coreRoot = resolve(srcRoot, 'core');
const forbiddenTopLevelDirs = new Set([
  'app',
  'config',
  'domains',
  'services',
  'state',
  'ui',
]);

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    if (!entry.isFile()) return [];
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

function moduleSpecifiers(source: ts.SourceFile): string[] {
  const specifiers: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1
    ) {
      const [specifier] = node.arguments;
      if (specifier && ts.isStringLiteral(specifier)) {
        specifiers.push(specifier.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return specifiers;
}

function resolveRelativeImport(fromFile: string, specifier: string): string {
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

function isForbiddenProjectLayerImport(
  fromFile: string,
  specifier: string,
): boolean {
  if (!specifier.startsWith('.')) {
    const [firstSegment] = specifier.split('/');
    return forbiddenTopLevelDirs.has(firstSegment ?? '');
  }

  const resolvedSpecifier = normalize(
    resolve(resolveRelativeImport(fromFile, specifier)),
  );

  if (!resolvedSpecifier.startsWith(`${srcRoot}/`)) {
    return false;
  }

  const relativeToSrc = resolvedSpecifier.slice(srcRoot.length + 1);
  const [firstSegment] = relativeToSrc.split('/');
  return forbiddenTopLevelDirs.has(firstSegment ?? '');
}

describe('core import boundary', () => {
  it('keeps every src/core module independent from Writer app layers', () => {
    const offenders = collectSourceFiles(coreRoot).flatMap((file) => {
      const sourceText = readFileSync(file, 'utf-8');
      const sourceFile = ts.createSourceFile(
        file,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
      );

      return moduleSpecifiers(sourceFile)
        .filter((specifier) => isForbiddenProjectLayerImport(file, specifier))
        .map((specifier) => ({
          file: normalize(file).slice(coreRoot.length + 1),
          specifier,
        }));
    });

    expect(offenders).toEqual([]);
  });
});
