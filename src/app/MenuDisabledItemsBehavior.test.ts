import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Disabled native menu items', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const menuRs = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'src', 'menu.rs'),
    'utf-8',
  );

  it('builds unsupported file and view items as disabled', () => {
    expect(menuRs).toMatch(
      /item_with_enabled\([\s\S]*"menu\.file\.export_pdf"[\s\S]*false,\s*\)\?/,
    );
    expect(menuRs).toMatch(
      /item_with_enabled\([\s\S]*"menu\.file\.export_html"[\s\S]*false,\s*\)\?/,
    );
    expect(menuRs).toMatch(
      /item_with_enabled\([\s\S]*"menu\.file\.export_image"[\s\S]*false,\s*\)\?/,
    );
    expect(menuRs).toMatch(
      /item_with_enabled\([\s\S]*"menu\.view\.source_mode"[\s\S]*false,\s*\)\?/,
    );
  });
});
