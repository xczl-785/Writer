import { describe, expect, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectSourceFiles,
  createImportBoundarySourceFile,
  importBoundarySpecifiers,
  moduleSpecifiers,
  normalizeImportPath,
  resolveRelativeImport,
} from '../../test/importBoundaryUtils';

const currentDir = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(currentDir, '..');
const normalizedSrcRoot = normalizeImportPath(srcRoot);
const coreRoot = resolve(srcRoot, 'core');
const normalizedCoreRoot = normalizeImportPath(coreRoot);
const forbiddenTopLevelDirs = new Set([
  'app',
  'config',
  'domains',
  'services',
  'state',
  'ui',
]);
const allowedExternalCoreEntryFiles = new Set(
  [
    'index.ts',
    'autosave/index.ts',
    'command/index.ts',
    'editor/index.ts',
    'save/index.ts',
    'session/index.ts',
  ].map((path) => `${normalizedCoreRoot}/${path}`),
);
const coreRuntimeEntryFile = `${normalizedCoreRoot}/runtime/index.ts`;
const allowedCoreRuntimeConsumerFiles = new Set(
  [
    // Runtime platform adapter: owns the Tauri-to-core port implementation.
    'services/runtime/TauriRuntimePorts.ts',
    // D-1 transition bridge: QuickWrite runtime adapter narrows core ports for
    // draft/session recovery until runtime ports move behind an app-local facade.
    'apps/quick-write/quickWriteRuntime.ts',
  ].map((path) => `${normalizedSrcRoot}/${path}`),
);

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

function isForbiddenRuntimeImport(
  fromFile: string,
  specifier: string,
): boolean {
  if (specifier.startsWith('@tauri-apps/')) {
    return true;
  }

  if (specifier.includes('src-tauri')) {
    return true;
  }

  if (!specifier.startsWith('.')) {
    return false;
  }

  const resolvedSpecifier = normalizeImportPath(
    resolve(resolveRelativeImport(fromFile, specifier)),
  );

  return resolvedSpecifier.includes('/src-tauri/');
}

function resolvedCoreImportFile(
  fromFile: string,
  specifier: string,
): string | null {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const resolvedSpecifier = normalizeImportPath(
    resolve(resolveRelativeImport(fromFile, specifier)),
  );

  if (
    resolvedSpecifier === normalizedCoreRoot ||
    resolvedSpecifier.startsWith(`${normalizedCoreRoot}/`)
  ) {
    return resolvedSpecifier;
  }

  return null;
}

function isAllowedExternalCoreImport(fromFile: string, resolved: string) {
  if (resolved === coreRuntimeEntryFile) {
    return allowedCoreRuntimeConsumerFiles.has(normalizeImportPath(fromFile));
  }

  return allowedExternalCoreEntryFiles.has(resolved);
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

  it('keeps Tauri runtime imports outside src/core', () => {
    const offenders = collectSourceFiles(coreRoot).flatMap((file) => {
      const sourceFile = createImportBoundarySourceFile(file);

      return moduleSpecifiers(sourceFile)
        .filter((specifier) => isForbiddenRuntimeImport(file, specifier))
        .map((specifier) => ({
          file: normalizeImportPath(file).slice(coreRoot.length + 1),
          specifier,
        }));
    });

    expect(offenders).toEqual([]);
  });

  it('keeps production consumers on core package entry points', () => {
    const offenders = collectSourceFiles(srcRoot, { includeTests: false })
      .filter(
        (file) =>
          !normalizeImportPath(file).startsWith(`${normalizedCoreRoot}/`),
      )
      .flatMap((file) => {
        const sourceFile = createImportBoundarySourceFile(file);

        return importBoundarySpecifiers(sourceFile)
          .map(({ specifier }) => ({
            specifier,
            resolved: resolvedCoreImportFile(file, specifier),
          }))
          .filter(
            (entry): entry is { specifier: string; resolved: string } =>
              entry.resolved !== null,
          )
          .filter((entry) => !isAllowedExternalCoreImport(file, entry.resolved))
          .map(({ specifier, resolved }) => ({
            file: normalizeImportPath(file).slice(normalizedSrcRoot.length + 1),
            specifier,
            resolved: resolved.slice(normalizedSrcRoot.length + 1),
          }));
      });

    expect(offenders).toEqual([]);
  });
});
