import type { OutlineItem } from './useOutlineExtractor';

export function findActiveOutlineIndex(
  items: OutlineItem[],
  position: number,
): number {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].position <= position) {
      return i;
    }
  }
  return -1;
}

export interface OutlineWindow {
  start: number;
  end: number;
}

export function computeOutlineWindow(args: {
  total: number;
  scrollTop: number;
  rowHeight: number;
  overscan: number;
  maxVisible: number;
}): OutlineWindow {
  const { total, scrollTop, rowHeight, overscan, maxVisible } = args;
  if (total <= maxVisible) {
    return { start: 0, end: total };
  }

  const baseStart = Math.floor(scrollTop / rowHeight);
  const start = Math.max(0, baseStart - overscan);
  const end = Math.min(total, start + maxVisible + overscan * 2);
  return { start, end };
}
