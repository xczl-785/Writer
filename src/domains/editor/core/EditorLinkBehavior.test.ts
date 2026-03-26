import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor link behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const bubbleMenuTs = readFileSync(
    join(currentDir, '..', 'ui', 'menus', 'BubbleMenu.tsx'),
    'utf-8',
  );
  const menuHandlerTs = readFileSync(
    join(currentDir, '..', 'handlers', 'menuCommandHandler.ts'),
    'utf-8',
  );

  it('routes bubble menu and native menu link actions through shared link action helper', () => {
    expect(bubbleMenuTs).toContain('applyLinkAction');
    expect(bubbleMenuTs).not.toContain('Link editor coming soon');
    expect(menuHandlerTs).toContain('applyLinkAction');
    expect(menuHandlerTs).not.toContain(
      "case 'format.link':\n      case 'format.image':",
    );
  });
});
