/**
 * Outline Item Component
 *
 * Individual outline item with proper indentation and click handling.
 */

import React from 'react';
import type { OutlineItem as OutlineItemType } from './useOutlineExtractor';

export interface OutlineItemProps {
  item: OutlineItemType;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Outline Item Component
 */
export const OutlineItemComponent: React.FC<OutlineItemProps> = ({
  item,
  isActive,
  onClick,
}) => {
  const indentPx = (item.level - 1) * 12;

  return (
    <button
      onClick={onClick}
      style={{ paddingLeft: `${indentPx + 8}px` }}
      className={`
        w-full text-left py-1 pr-2 text-sm truncate
        transition-colors duration-150 ease-out
        ${
          isActive
            ? 'bg-blue-100/80 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
        }
      `}
      title={item.text}
    >
      <span className={item.level === 1 ? 'font-semibold' : ''}>
        {item.text}
      </span>
    </button>
  );
};
