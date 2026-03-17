import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('native file menu create entries', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(
    join(currentDir, '..', '..', '..', 'src-tauri', 'src', 'menu.rs'),
    'utf-8',
  );

  it('exposes separate native entries for new file and new folder', () => {
    expect(source).toContain('"menu.file.new"');
    expect(source).toContain('"新建文件"');
    expect(source).toContain('"New File"');
    expect(source).toContain('"menu.file.new_folder"');
    expect(source).toContain('"新建文件夹"');
    expect(source).toContain('"New Folder"');
  });
});
