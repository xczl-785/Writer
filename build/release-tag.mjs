import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const packageJsonPath = resolve(rootDir, 'package.json');
const tauriConfigPath = resolve(rootDir, 'src-tauri', 'tauri.conf.json');

const pushTag = process.argv.includes('--push');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function runGit(args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  }).trim();
}

function main() {
  const pkg = readJson(packageJsonPath);
  const tauriConfig = readJson(tauriConfigPath);

  if (pkg.version !== tauriConfig.version) {
    console.error(
      `Version mismatch: package.json=${pkg.version}, src-tauri/tauri.conf.json=${tauriConfig.version}`,
    );
    process.exit(1);
  }

  const tagName = `v${pkg.version}`;

  try {
    const status = runGit(['status', '--short']);
    if (status) {
      console.error('Working tree is not clean. Commit or stash changes before tagging.');
      process.exit(1);
    }

    const existingTag = runGit(['tag', '--list', tagName]);
    if (existingTag === tagName) {
      console.error(`Tag ${tagName} already exists locally.`);
      process.exit(1);
    }

    runGit(['tag', '-a', tagName, '-m', `Writer ${tagName}`]);
    console.log(`Created tag ${tagName}`);

    if (pushTag) {
      runGit(['push', 'origin', tagName]);
      console.log(`Pushed tag ${tagName} to origin`);
    } else {
      console.log(`Push it with: git push origin ${tagName}`);
    }
  } catch (error) {
    const message =
      error instanceof Error && 'message' in error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

main();
