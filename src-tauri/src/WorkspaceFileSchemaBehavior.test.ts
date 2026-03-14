import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('workspace file schema compatibility markers', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'fs.rs'), 'utf-8');

  it('serializes workspace state in camelCase while accepting legacy snake_case fields', () => {
    expect(source).toContain('#[serde(rename_all = "camelCase")]');
    expect(source).toContain('#[serde(alias = "open_files")]');
    expect(source).toContain('#[serde(alias = "active_file")]');
    expect(source).toContain('#[serde(alias = "sidebar_visible")]');
  });
});
