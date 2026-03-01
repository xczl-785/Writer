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
      type="button"
      onClick={onClick}
      style={{ paddingLeft: `${indentPx + 8}px` }}
      className={`
        w-full truncate rounded-md py-1.5 pr-2 text-left text-sm
        transition-colors duration-150 ease-out
        ${
          isActive
            ? 'border-l-2 border-blue-500 bg-blue-50/60 text-blue-700'
            : 'text-zinc-600 hover:bg-zinc-100'
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
