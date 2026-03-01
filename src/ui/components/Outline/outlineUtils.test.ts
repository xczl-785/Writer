import { describe, expect, it } from 'vitest';
import { computeOutlineWindow, findActiveOutlineIndex } from './outlineUtils';
import type { OutlineItem } from './useOutlineExtractor';

const sampleItems: OutlineItem[] = [
  { id: 'h1', level: 1, text: 'A', position: 2 },
  { id: 'h2', level: 2, text: 'B', position: 20 },
  { id: 'h3', level: 2, text: 'C', position: 50 },
];

describe('outlineUtils', () => {
  it('finds active heading index by cursor position', () => {
    expect(findActiveOutlineIndex(sampleItems, 1)).toBe(-1);
    expect(findActiveOutlineIndex(sampleItems, 2)).toBe(0);
    expect(findActiveOutlineIndex(sampleItems, 21)).toBe(1);
    expect(findActiveOutlineIndex(sampleItems, 100)).toBe(2);
  });

  it('returns full range when total <= maxVisible', () => {
    expect(
      computeOutlineWindow({
        total: 100,
        scrollTop: 1000,
        rowHeight: 28,
        overscan: 6,
        maxVisible: 200,
      }),
    ).toEqual({ start: 0, end: 100 });
  });

  it('computes windowed range for large outlines', () => {
    expect(
      computeOutlineWindow({
        total: 1000,
        scrollTop: 1400,
        rowHeight: 28,
        overscan: 6,
        maxVisible: 200,
      }),
    ).toEqual({ start: 44, end: 256 });
  });
});
