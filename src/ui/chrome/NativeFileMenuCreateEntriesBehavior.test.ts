import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FILE_MENU_CREATE_ITEMS } from './menuSchema';

describe('native file menu create entries', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(
    join(currentDir, '..', '..', '..', 'src-tauri', 'src', 'menu.rs'),
    'utf-8',
  );

  it('keeps native menu labels aligned with the shared create entry definitions', () => {
    for (const item of FILE_MENU_CREATE_ITEMS) {
      expect(source).toContain(`"${item.id}"`);
      expect(source).toContain(`"${item.fallbackLabels['zh-CN']}"`);
      expect(source).toContain(`"${item.fallbackLabels['en-US']}"`);
    }
  });
});
