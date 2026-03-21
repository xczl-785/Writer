import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const PACKAGE_JSON_PATH = resolve(rootDir, 'package.json');
const TAURI_CONF_PATH = resolve(rootDir, 'src-tauri', 'tauri.conf.json');

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function main() {
  const pkg = readJson(PACKAGE_JSON_PATH);
  const tauriConf = readJson(TAURI_CONF_PATH);

  console.log('\n当前版本号:');
  console.log(`  package.json       → ${pkg.version}`);
  console.log(`  tauri.conf.json    → ${tauriConf.version}`);

  if (pkg.version !== tauriConf.version) {
    console.log('\n  ⚠ 两个文件版本号不一致');
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  rl.question('\n请输入新版本号（直接回车跳过）: ', (answer) => {
    const input = answer.trim();

    if (!input) {
      console.log('已跳过，未更新版本号。');
      rl.close();
      return;
    }

    if (!SEMVER_REGEX.test(input)) {
      console.error(`错误: "${input}" 不是有效的 semver 格式（x.y.z）`);
      rl.close();
      process.exit(1);
    }

    pkg.version = input;
    tauriConf.version = input;

    writeJson(PACKAGE_JSON_PATH, pkg);
    writeJson(TAURI_CONF_PATH, tauriConf);

    console.log(`\n✓ 版本号已更新为 ${input}`);
    console.log('  package.json       ✓');
    console.log('  tauri.conf.json    ✓');

    rl.close();
  });
}

main();
