import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('native file menu workspace items', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'menu.rs'), 'utf-8');
  const writerBuilder = source.slice(
    source.indexOf('fn build_writer_native_menu_with_locale'),
    source.indexOf('fn build_quick_write_native_menu_with_locale'),
  );

  it('includes dedicated workspace save commands in the file menu', () => {
    expect(writerBuilder).toContain('"menu.file.save"');
    expect(writerBuilder).toContain('"保存"');
    expect(writerBuilder).toContain('"Save"');
    expect(writerBuilder).toContain('Some("CmdOrCtrl+S")');
    expect(writerBuilder).toContain('"menu.file.save_workspace"');
    expect(writerBuilder).toContain('"保存工作区"');
    expect(writerBuilder).toContain('"menu.file.save_workspace_as"');
    expect(writerBuilder).toContain('"工作区另存为…"');
  });

  it('keeps Writer workspace open and close commands in the file menu', () => {
    expect(writerBuilder).toContain('"menu.file.open_folder"');
    expect(writerBuilder).toContain('"menu.file.open_workspace"');
    expect(writerBuilder).toContain('"menu.file.open_recent"');
    expect(writerBuilder).toContain('"menu.file.add_folder_to_workspace"');
    expect(writerBuilder).toContain('"menu.file.close_folder"');
    expect(writerBuilder).toContain('"menu.file.close_workspace"');
  });
});
