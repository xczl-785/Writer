import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const coreDir = join(repoRoot, 'vendor', 'Write-core');
const stateDir = join(repoRoot, '.cache');
const statePath = join(stateDir, 'writer-core-build.json');

function fail(message) {
  console.error(`[prepare-core] ${message}`);
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function output(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function mtimeMs(path) {
  return existsSync(path) ? statSync(path).mtimeMs : 0;
}

function latestMtime(paths) {
  let latest = 0;
  const visit = (path) => {
    if (!existsSync(path)) return;
    const stat = statSync(path);
    latest = Math.max(latest, stat.mtimeMs);
    if (!stat.isDirectory()) return;

    for (const entry of readdirSync(path)) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') {
        continue;
      }
      visit(join(path, entry));
    }
  };

  for (const path of paths) visit(path);
  return latest;
}

function readState() {
  if (!existsSync(statePath)) return {};
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(`${statePath}.tmp`, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(`${statePath}.tmp`, statePath);
}

function ensureCorePresent() {
  if (existsSync(join(coreDir, 'package.json'))) return;
  fail(
    'Core submodule is missing. Run: git submodule update --init --recursive',
  );
}

function ensureCoreDependencies() {
  const nodeModules = join(coreDir, 'node_modules');
  const npmLockState = join(nodeModules, '.package-lock.json');
  const packageLock = join(coreDir, 'package-lock.json');

  if (!existsSync(nodeModules) || mtimeMs(packageLock) > mtimeMs(npmLockState)) {
    console.log('[prepare-core] Installing @writer/core dependencies');
    run('npm', ['install', '--prefer-offline', '--no-audit'], coreDir);
  }
}

function ensureCoreBuild() {
  const distEntry = join(coreDir, 'dist', 'index.js');
  const sourceMtime = latestMtime([
    join(coreDir, 'package.json'),
    join(coreDir, 'tsconfig.json'),
    join(coreDir, 'tsconfig.build.json'),
    join(coreDir, 'src'),
  ]);
  const distMtime = mtimeMs(distEntry);
  const coreCommit = output('git', ['rev-parse', 'HEAD'], coreDir);
  const state = readState();
  const shouldBuild =
    !existsSync(distEntry) ||
    sourceMtime > distMtime ||
    state.coreCommit !== coreCommit;

  if (!shouldBuild) {
    console.log('[prepare-core] @writer/core dist is current');
    return;
  }

  console.log('[prepare-core] Building @writer/core');
  run('npm', ['run', 'build'], coreDir);
  writeState({
    coreCommit,
    builtAt: new Date().toISOString(),
  });
}

ensureCorePresent();
ensureCoreDependencies();
ensureCoreBuild();
