import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor image behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const slashMenuTs = readFileSync(
    join(currentDir, 'menus', 'useSlashMenu.ts'),
    'utf-8',
  );
  const menuHandlerTs = readFileSync(
    join(currentDir, 'handlers', 'menuCommandHandler.ts'),
    'utf-8',
  );

  it('routes image insertion through shared image action helper', () => {
    expect(slashMenuTs).toContain('applyImageAction');
    expect(slashMenuTs).not.toContain('readAsDataURL');
    expect(menuHandlerTs).toContain('applyImageAction');
    expect(menuHandlerTs).not.toContain("setStatus('idle', t('status.menu.todo'))");
  });
});
