import { describe, expect, it } from 'vitest';
import {
  computeSlashMenuLayout,
  SLASH_MENU_EDGE_PADDING,
  SLASH_MENU_TRIGGER_GAP,
} from './slashLayout';

describe('slash layout', () => {
  it('enables internal scrolling when viewport is tall but available space is insufficient', () => {
    const layout = computeSlashMenuLayout({
      anchorRect: { left: 120, top: 420, bottom: 444 },
      menuHeight: 420,
      viewportWidth: 1200,
      viewportHeight: 800,
    });

    expect(layout.overflowY).toBe('auto');
    expect(layout.maxHeight).toMatch(/px$/);
  });

  it('keeps menu below the caret when there is enough space below', () => {
    const layout = computeSlashMenuLayout({
      anchorRect: { left: 80, top: 100, bottom: 124 },
      menuHeight: 220,
      viewportWidth: 1000,
      viewportHeight: 800,
    });

    expect(layout.top).toBe(124 + SLASH_MENU_TRIGGER_GAP);
    expect(layout.maxHeight).toBeUndefined();
    expect(layout.overflowY).toBeUndefined();
  });

  it('clamps horizontal position to viewport padding', () => {
    const layout = computeSlashMenuLayout({
      anchorRect: { left: -100, top: 120, bottom: 144 },
      menuHeight: 180,
      viewportWidth: 700,
      viewportHeight: 700,
    });

    expect(layout.left).toBe(SLASH_MENU_EDGE_PADDING);
  });
});
