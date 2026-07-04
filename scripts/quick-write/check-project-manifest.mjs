import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..', '..');
const manifestPath = join(projectRoot, 'quick-write.project.json');
const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts'];

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

const failures = [];
const requiredUiFidelityObjects = [
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

function normalizePath(path) {
  return normalize(path).replaceAll('\\', '/');
}

function projectPath(path) {
  return normalizePath(relative(projectRoot, path));
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function flattenObjectValues(value) {
  if (Array.isArray(value)) {
    return value.flatMap(flattenObjectValues);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(flattenObjectValues);
  }

  return typeof value === 'string' ? [value] : [];
}

function collectSourceFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    if (!entry.isFile()) return [];
    if (!sourceExtensions.includes(extname(entry.name))) return [];
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return [path];
  });
}

function stripComments(source) {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/(^|[^:])\/\/.*$/gm, '$1');
}

function importSpecifiers(source) {
  const stripped = stripComments(source);
  const specifiers = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(stripped)) !== null) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function resolveRelativeImport(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => join(base, `index${extension}`)),
  ];

  return candidates.find((candidate) => {
    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}

function resolveProjectImport(fromFile, specifier) {
  if (specifier.startsWith('.')) {
    const resolved = resolveRelativeImport(fromFile, specifier);
    if (!resolved) return null;
    if (!normalizePath(resolved).startsWith(`${normalizePath(projectRoot)}/`)) {
      return null;
    }
    return projectPath(resolved).replace(/\.(c|m)?tsx?$/, '');
  }

  if (specifier.startsWith('/src/')) {
    return specifier.slice(1).replace(/\.(c|m)?tsx?$/, '');
  }

  if (specifier.startsWith('src/')) {
    return specifier.replace(/\.(c|m)?tsx?$/, '');
  }

  return null;
}

function pathMatchesPattern(path, pattern) {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(pattern).replace(/\.(c|m)?tsx?$/, '');
  return (
    normalizedPath === normalizedPattern ||
    normalizedPath.startsWith(`${normalizedPattern}/`)
  );
}

function validateRequiredPaths() {
  assert(Array.isArray(manifest.requiredPaths), 'requiredPaths must be an array');

  for (const requiredPath of manifest.requiredPaths ?? []) {
    assert(
      existsSync(join(projectRoot, requiredPath)),
      `required path is missing: ${requiredPath}`,
    );
  }
}

function validateManifestEnumeratesRequiredObjects() {
  for (const key of [
    'entryHtml',
    'appShell',
    'runtime',
    'menu',
    'status',
    'editor',
    'tauriConfigAndNativeTests',
  ]) {
    assert(
      Array.isArray(manifest.quickWriteObjects?.[key]) &&
        manifest.quickWriteObjects[key].length > 0,
      `quickWriteObjects.${key} must enumerate at least one path`,
    );

    for (const objectPath of manifest.quickWriteObjects?.[key] ?? []) {
      assert(
        existsSync(join(projectRoot, objectPath)),
        `quickWriteObjects.${key} path is missing: ${objectPath}`,
      );
    }
  }

  for (const key of [
    'corePublicExports',
    'sharedEditorAdapters',
    'sharedServiceAndRuntimeAdapters',
  ]) {
    assert(
      Array.isArray(manifest.allowedProductionDependencies?.[key]) &&
        manifest.allowedProductionDependencies[key].length > 0,
      `allowedProductionDependencies.${key} must enumerate at least one dependency`,
    );
  }

  assert(
    Array.isArray(manifest.uiFidelityNotes) &&
      manifest.uiFidelityNotes.some((note) =>
        note.includes('must not copy the Writer product UI'),
      ),
    'uiFidelityNotes must distinguish shared core/adapters from copied Writer product UI',
  );
}

function validateUiFidelityBaseline() {
  const baseline = manifest.uiFidelityBaseline;
  assert(
    baseline && typeof baseline === 'object' && !Array.isArray(baseline),
    'uiFidelityBaseline must be an object',
  );

  const classificationValues = baseline?.classificationValues;
  assert(
    Array.isArray(classificationValues) && classificationValues.length > 0,
    'uiFidelityBaseline.classificationValues must enumerate allowed classifications',
  );

  const allowedClassifications = new Set(classificationValues ?? []);
  for (const classification of [
    'core',
    'quickwrite-copy',
    'adapter',
    'writer-retain',
    'later-decision',
  ]) {
    assert(
      allowedClassifications.has(classification),
      `uiFidelityBaseline.classificationValues must include ${classification}`,
    );
  }

  const matrix = baseline?.classificationMatrix;
  assert(
    matrix && typeof matrix === 'object' && !Array.isArray(matrix),
    'uiFidelityBaseline.classificationMatrix must be an object',
  );

  for (const objectName of requiredUiFidelityObjects) {
    const entry = matrix?.[objectName];
    assert(
      entry && typeof entry === 'object' && !Array.isArray(entry),
      `uiFidelityBaseline.classificationMatrix.${objectName} must exist`,
    );
    assert(
      typeof entry?.classification === 'string',
      `uiFidelityBaseline.classificationMatrix.${objectName}.classification must exist`,
    );
    assert(
      allowedClassifications.has(entry?.classification),
      `uiFidelityBaseline.classificationMatrix.${objectName}.classification is invalid: ${entry?.classification}`,
    );
    assert(
      Array.isArray(entry?.paths) && entry.paths.length > 0,
      `uiFidelityBaseline.classificationMatrix.${objectName}.paths must enumerate at least one path`,
    );

    for (const objectPath of entry?.paths ?? []) {
      assert(
        typeof objectPath === 'string' && existsSync(join(projectRoot, objectPath)),
        `uiFidelityBaseline.classificationMatrix.${objectName} path is missing: ${objectPath}`,
      );
    }
  }

  for (const objectName of writerProductUiObjects) {
    assert(
      matrix?.[objectName]?.classification !== 'core',
      `Writer product UI ${objectName} must not be classified as core`,
    );
  }
}

function validateRejectedCopiesDoNotExist() {
  for (const rejectedPath of manifest.forbiddenProductionDependencies
    ?.rejectedQuickWriteCopies ?? []) {
    assert(
      !existsSync(join(projectRoot, rejectedPath)),
      `rejected QuickWrite copy exists: ${rejectedPath}`,
    );
  }
}

function validateProductionImports() {
  const forbiddenPatterns = flattenObjectValues(
    manifest.forbiddenProductionDependencies,
  ).filter((pattern) => pattern.startsWith('src/'));
  const forbiddenSymbols = flattenObjectValues(
    manifest.forbiddenProductionDependencies,
  ).filter((pattern) => !pattern.startsWith('src/'));

  const productionFiles = (manifest.productionImportRoots ?? []).flatMap((root) =>
    collectSourceFiles(join(projectRoot, root)),
  );

  assert(
    productionFiles.length > 0,
    'productionImportRoots must resolve to at least one production source file',
  );

  for (const file of productionFiles) {
    const source = readFileSync(file, 'utf-8');
    const imports = importSpecifiers(source);

    for (const specifier of imports) {
      const importedProjectPath = resolveProjectImport(file, specifier);
      if (importedProjectPath) {
        for (const forbiddenPattern of forbiddenPatterns) {
          assert(
            !pathMatchesPattern(importedProjectPath, forbiddenPattern),
            `${projectPath(file)} imports forbidden QuickWrite dependency ${specifier} -> ${importedProjectPath}`,
          );
        }
      }

      for (const forbiddenSymbol of forbiddenSymbols) {
        assert(
          !specifier.includes(forbiddenSymbol),
          `${projectPath(file)} import specifier mentions forbidden symbol ${forbiddenSymbol}: ${specifier}`,
        );
      }
    }

    for (const forbiddenSymbol of forbiddenSymbols) {
      assert(
        !source.includes(forbiddenSymbol),
        `${projectPath(file)} source mentions forbidden symbol ${forbiddenSymbol}`,
      );
    }
  }
}

validateRequiredPaths();
validateManifestEnumeratesRequiredObjects();
validateUiFidelityBaseline();
validateRejectedCopiesDoNotExist();
validateProductionImports();

if (failures.length > 0) {
  console.error('QuickWrite project manifest check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `QuickWrite project manifest check passed (${manifest.requiredPaths.length} required paths, ${manifest.productionImportRoots.length} production root).`,
);
