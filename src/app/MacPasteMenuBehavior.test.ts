import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Mac paste menu behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const menuRs = readFileSync(
    join(currentDir, '..', '..', 'src-tauri', 'src', 'menu.rs'),
    'utf-8',
  );

  it('uses predefined native edit items for clipboard actions', () => {
    expect(menuRs).toContain('PredefinedMenuItem');
    expect(menuRs).toContain('PredefinedMenuItem::cut');
    expect(menuRs).toContain('PredefinedMenuItem::copy');
    expect(menuRs).toContain('PredefinedMenuItem::paste');
    expect(menuRs).toContain('PredefinedMenuItem::select_all');
  });

  it('adds an explicit native plain paste item next to the predefined paste entry', () => {
    expect(menuRs).toContain('menu.edit.paste_plain');
    expect(menuRs).toContain('Paste as Plain Text');
    expect(menuRs).toContain('Some("CmdOrCtrl+Shift+V")');
  });
});
