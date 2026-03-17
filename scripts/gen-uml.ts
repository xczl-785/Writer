/**
 * UML Generator - 从 TypeScript 代码自动生成 PlantUML 架构图
 *
 * 用法: npx tsx scripts/gen-uml.ts [--module <name>]
 *
 * 自动扫描 src/ 目录结构，按目录划分模块，无需手动配置。
 */

import {
  Project,
  SourceFile,
  ClassDeclaration,
  InterfaceDeclaration,
  Type,
} from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'uml-config.yaml');
const OUTPUT_DIR = path.join(ROOT_DIR, 'docs/generated/auto');

interface Config {
  exclude?: string[];
  ignore_relations?: string[];
  merge_modules?: Record<string, string[]>;
}

interface ClassInfo {
  name: string;
  id: string;
  module: string;
  extends?: string;
  implements: string[];
  properties: { name: string; type: string }[];
  methods: { name: string; params: string[]; returnType: string }[];
  dependencies: string[];
}

const DEFAULT_CONFIG: Config = {
  exclude: [
    '.*\\.test\\.ts$',
    '.*\\.test\\.tsx$',
    '.*\\.d\\.ts$',
    '.*vite-env\\.d\\.ts$',
  ],
  ignore_relations: [
    'React.FC',
    'React.ReactNode',
    'React.ReactElement',
    'React.Component',
    'JSX.Element',
    'HTMLElement',
    'Event',
    'MouseEvent',
    'KeyboardEvent',
    'DragEvent',
    'ChangeEvent',
    'FocusEvent',
  ],
};

function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const parsed = yaml.parse(content) || {};
  return {
    ...DEFAULT_CONFIG,
    ...parsed,
  };
}

function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  return excludePatterns.some((pattern) => {
    const regex = new RegExp(pattern);
    return regex.test(relativePath);
  });
}

function discoverModules(
  srcDir: string,
  mergeConfig?: Record<string, string[]>,
): Map<string, string[]> {
  const modules = new Map<string, string[]>();

  if (!fs.existsSync(srcDir)) {
    return modules;
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules') continue;

    const dirPath = path.join(srcDir, entry.name);
    const subEntries = fs.readdirSync(dirPath, { withFileTypes: true });
    const subDirs = subEntries.filter(
      (e) => e.isDirectory() && e.name !== 'node_modules',
    );

    if (subDirs.length > 0) {
      for (const subDir of subDirs) {
        const subDirPath = path.join(dirPath, subDir.name);
        const moduleFiles = discoverTypeScriptFiles(subDirPath);
        if (moduleFiles.length > 0) {
          const moduleName = `${entry.name}/${subDir.name}`;
          modules.set(moduleName, moduleFiles);
        }
      }
    } else {
      const moduleFiles = discoverTypeScriptFiles(dirPath);
      if (moduleFiles.length > 0) {
        modules.set(entry.name, moduleFiles);
      }
    }
  }

  if (mergeConfig) {
    for (const [targetModule, sourceModules] of Object.entries(mergeConfig)) {
      const mergedFiles: string[] = [];
      for (const source of sourceModules) {
        if (modules.has(source)) {
          mergedFiles.push(...modules.get(source)!);
          modules.delete(source);
        }
      }
      if (modules.has(targetModule)) {
        mergedFiles.push(...modules.get(targetModule)!);
      }
      if (mergedFiles.length > 0) {
        modules.set(targetModule, mergedFiles);
      }
    }
  }

  return modules;
}

function discoverTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function extractTypeInfo(type: Type): string {
  const text = type.getText();
  if (text.includes('import(')) {
    const match = text.match(/\.([^)".]+)"?\]?$/);
    return match ? match[1] : text;
  }
  return text;
}

function analyzeClass(
  cls: ClassDeclaration,
  module: string,
  ignoreRelations: string[],
): ClassInfo {
  const name = cls.getName() || 'Anonymous';
  const id = `${module}/${name}`;

  const extendsType = cls.getExtends();
  const extendsName = extendsType
    ? extractTypeInfo(extendsType.getType())
    : undefined;

  const implementsNames = cls
    .getImplements()
    .map((i) => extractTypeInfo(i.getType()));

  const properties = cls.getProperties().map((p) => ({
    name: p.getName(),
    type: extractTypeInfo(p.getType()),
  }));

  const methods = cls.getMethods().map((m) => ({
    name: m.getName(),
    params: m.getParameters().map((p) => p.getName()),
    returnType: extractTypeInfo(m.getReturnType()),
  }));

  const dependencies = new Set<string>();

  properties.forEach((p) => {
    if (
      !ignoreRelations.some((r) => p.type.includes(r)) &&
      !p.type.match(/^(string|number|boolean|void|null|undefined)/)
    ) {
      dependencies.add(p.type);
    }
  });

  methods.forEach((m) => {
    if (
      !ignoreRelations.some((r) => m.returnType.includes(r)) &&
      !m.returnType.match(/^(string|number|boolean|void|null|undefined)/)
    ) {
      dependencies.add(m.returnType);
    }
  });

  return {
    name,
    id,
    module,
    extends: extendsName,
    implements: implementsNames,
    properties,
    methods,
    dependencies: Array.from(dependencies),
  };
}

function analyzeInterface(
  intf: InterfaceDeclaration,
  module: string,
  ignoreRelations: string[],
): ClassInfo {
  const name = intf.getName();
  const id = `${module}/${name}`;

  const extendsTypes = intf
    .getExtends()
    .map((e) => extractTypeInfo(e.getType()));

  const properties = intf.getProperties().map((p) => ({
    name: p.getName(),
    type: extractTypeInfo(p.getType()),
  }));

  const methods = intf.getMethods().map((m) => ({
    name: m.getName(),
    params: m.getParameters().map((p) => p.getName()),
    returnType: extractTypeInfo(m.getReturnType()),
  }));

  const dependencies = new Set<string>();

  properties.forEach((p) => {
    if (
      !ignoreRelations.some((r) => p.type.includes(r)) &&
      !p.type.match(/^(string|number|boolean|void|null|undefined)/)
    ) {
      dependencies.add(p.type);
    }
  });

  return {
    name,
    id,
    module,
    extends: extendsTypes[0],
    implements: [],
    properties,
    methods,
    dependencies: Array.from(dependencies),
  };
}

function generatePlantUML(classes: ClassInfo[], moduleName: string): string {
  const lines: string[] = [
    `@startuml ${moduleName}`,
    '',
    '!theme plain',
    'skinparam classAttributeIconSize 0',
    '',
    `package "${moduleName}" {`,
  ];

  const classIds = new Set(classes.map((c) => c.id));

  classes.forEach((cls) => {
    lines.push(`  class ${cls.id.replace(/\//g, '.')} {`);
    cls.properties.slice(0, 5).forEach((p) => {
      lines.push(`    + ${p.name}: ${p.type}`);
    });
    if (cls.properties.length > 5) {
      lines.push(`    .. ${cls.properties.length - 5} more ..`);
    }
    lines.push('  }');

    if (cls.extends && classIds.has(cls.extends)) {
      lines.push(
        `  ${cls.extends.replace(/\//g, '.')} <|-- ${cls.id.replace(/\//g, '.')}`,
      );
    }

    cls.implements.forEach((impl) => {
      if (classIds.has(impl)) {
        lines.push(
          `  ${impl.replace(/\//g, '.')} <|.. ${cls.id.replace(/\//g, '.')}`,
        );
      }
    });
  });

  lines.push('}');
  lines.push('');
  lines.push('@enduml');

  return lines.join('\n');
}

function generateModulesDiagram(modules: Map<string, ClassInfo[]>): string {
  const lines: string[] = [
    '@startuml modules',
    '',
    '!theme plain',
    'skinparam packageStyle rectangle',
    '',
  ];

  const moduleDeps = new Map<string, Set<string>>();

  modules.forEach((classes, moduleName) => {
    lines.push(`package "${moduleName}" {`);
    classes.slice(0, 10).forEach((cls) => {
      lines.push(`  [${cls.name}]`);
    });
    if (classes.length > 10) {
      lines.push(`  .. ${classes.length - 10} more ..`);
    }
    lines.push('}');

    classes.forEach((cls) => {
      cls.dependencies.forEach((dep) => {
        modules.forEach((otherClasses, otherModule) => {
          if (otherModule !== moduleName) {
            if (otherClasses.some((c) => c.name === dep || c.id === dep)) {
              if (!moduleDeps.has(moduleName)) {
                moduleDeps.set(moduleName, new Set());
              }
              moduleDeps.get(moduleName)!.add(otherModule);
            }
          }
        });
      });
    });
  });

  lines.push('');

  moduleDeps.forEach((deps, from) => {
    deps.forEach((to) => {
      lines.push(`"${from}" --> "${to}"`);
    });
  });

  lines.push('');
  lines.push('@enduml');

  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const moduleFilter = args[args.indexOf('--module') + 1] || null;

  const config = loadConfig();
  const srcDir = path.join(ROOT_DIR, 'src');

  console.log('Scanning src/ directory...');
  const moduleFiles = discoverModules(srcDir, config.merge_modules);
  console.log(`Found ${moduleFiles.size} modules`);

  const project = new Project({
    tsConfigFilePath: path.join(ROOT_DIR, 'tsconfig.app.json'),
  });

  const modulesMap = new Map<string, ClassInfo[]>();

  moduleFiles.forEach((files, moduleName) => {
    if (moduleFilter && moduleName !== moduleFilter) return;

    const classes: ClassInfo[] = [];

    files.forEach((filePath) => {
      if (shouldExclude(filePath, config.exclude || [])) return;

      const sourceFile = project.getSourceFile(filePath);
      if (!sourceFile) return;

      sourceFile.getClasses().forEach((cls) => {
        classes.push(
          analyzeClass(cls, moduleName, config.ignore_relations || []),
        );
      });

      sourceFile.getInterfaces().forEach((intf) => {
        classes.push(
          analyzeInterface(intf, moduleName, config.ignore_relations || []),
        );
      });
    });

    if (classes.length > 0) {
      modulesMap.set(moduleName, classes);
    }
  });

  for (const [moduleName, classes] of modulesMap) {
    const outputPath = path.join(OUTPUT_DIR, `${moduleName}.puml`);
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const puml = generatePlantUML(classes, moduleName);
    fs.writeFileSync(outputPath, puml, 'utf-8');
    console.log(`Generated: ${path.relative(ROOT_DIR, outputPath)}`);
  }

  const modulesPuml = generateModulesDiagram(modulesMap);
  const modulesPath = path.join(OUTPUT_DIR, 'modules.puml');
  fs.writeFileSync(modulesPath, modulesPuml, 'utf-8');
  console.log(`Generated: ${path.relative(ROOT_DIR, modulesPath)}`);

  console.log(`\nDone! Generated diagrams for ${modulesMap.size} modules.`);
}

main().catch(console.error);
