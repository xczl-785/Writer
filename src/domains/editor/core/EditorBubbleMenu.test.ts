import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor bubble menu timing', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readBubbleMenu = () =>
    readFileSync(join(currentDir, 'menus', 'BubbleMenu.tsx'), 'utf-8');

  it('keeps bubble menu debounce under 100ms', () => {
    const bubbleMenuTsx = readBubbleMenu();

    expect(bubbleMenuTsx).toContain('const BUBBLE_MENU_DEBOUNCE_MS = 80;');
    expect(bubbleMenuTsx).toContain('setTimeout(() => {');
    expect(bubbleMenuTsx).toContain('}, BUBBLE_MENU_DEBOUNCE_MS);');
  });
});
