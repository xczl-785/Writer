import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor image behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const slashMenuTs = readFileSync(
    join(currentDir, '..', 'ui', 'menus', 'useSlashMenu.ts'),
    'utf-8',
  );
  const menuHandlerTs = readFileSync(
    join(currentDir, '..', 'handlers', 'menuCommandHandler.ts'),
    'utf-8',
  );
  const editorImplTs = readFileSync(
    join(currentDir, 'EditorImpl.tsx'),
    'utf-8',
  );

  it('keeps slash image insertion behind an injected action port', () => {
    expect(slashMenuTs).toContain('imageAction?: SlashImageAction');
    expect(slashMenuTs).toContain('if (imageAction)');
    expect(slashMenuTs).not.toContain('applyImageAction');
    expect(editorImplTs).toContain('import { applyImageAction }');
    expect(editorImplTs).toContain('imageAction: applyImageAction');
    expect(slashMenuTs).not.toContain('readAsDataURL');
  });

  it('keeps Writer menu image insertion routed through image action helper', () => {
    expect(menuHandlerTs).toContain('imageAction?: MenuImageAction');
    expect(menuHandlerTs).not.toContain('applyImageAction');
    expect(editorImplTs).toContain('imageAction: applyImageAction');
    expect(menuHandlerTs).not.toContain(
      "setStatus('idle', t('status.menu.todo'))",
    );
  });
});
