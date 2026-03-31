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

  it('provides link editing in bubble menu via inline UI and link mode', () => {
    expect(bubbleMenuTs).toContain("mode: 'link'");
    expect(bubbleMenuTs).toContain('LinkModeContent');
    expect(bubbleMenuTs).toContain('.setLink(');
    expect(bubbleMenuTs).toContain('.unsetLink()');
  });

  it('routes native menu link actions through shared link action helper', () => {
    expect(menuHandlerTs).toContain('applyLinkAction');
    expect(menuHandlerTs).not.toContain(
      "case 'format.link':\n      case 'format.image':",
    );
  });
});
