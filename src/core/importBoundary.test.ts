import { describe, expect, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectSourceFiles,
  createImportBoundarySourceFile,
  moduleSpecifiers,
  normalizeImportPath,
  resolveRelativeImport,
} from '../../test/importBoundaryUtils';

const currentDir = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(currentDir, '..');
const normalizedSrcRoot = normalizeImportPath(srcRoot);
const coreRoot = resolve(srcRoot, 'core');
const forbiddenTopLevelDirs = new Set([
  'app',
  'config',
  'domains',
  'services',
  'state',
  'ui',
]);

function isForbiddenProjectLayerImport(
  fromFile: string,
  specifier: string,
): boolean {
  if (!specifier.startsWith('.')) {
    const [firstSegment] = specifier.split('/');
    return forbiddenTopLevelDirs.has(firstSegment ?? '');
  }

  const resolvedSpecifier = normalizeImportPath(
    resolve(resolveRelativeImport(fromFile, specifier)),
  );

  if (!resolvedSpecifier.startsWith(`${normalizedSrcRoot}/`)) {
    return false;
  }

  const relativeToSrc = resolvedSpecifier.slice(normalizedSrcRoot.length + 1);
  const [firstSegment] = relativeToSrc.split('/');
  return forbiddenTopLevelDirs.has(firstSegment ?? '');
}

describe('core import boundary', () => {
  it('keeps every src/core module independent from Writer app layers', () => {
    const offenders = collectSourceFiles(coreRoot).flatMap((file) => {
      const sourceFile = createImportBoundarySourceFile(file);

      return moduleSpecifiers(sourceFile)
        .filter((specifier) => isForbiddenProjectLayerImport(file, specifier))
        .map((specifier) => ({
          file: normalizeImportPath(file).slice(coreRoot.length + 1),
          specifier,
        }));
    });

    expect(offenders).toEqual([]);
  });
});
