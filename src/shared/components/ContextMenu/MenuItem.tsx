/**
 * Menu Item Component
 *
 * Individual menu item with support for icons, shortcuts, and danger styling.
 *
 * @see docs/current/UI/组件规范.md - 3.1 菜单项
 */

import React, { useEffect, useRef } from 'react';
import type { MenuItemConfig } from './contextMenuRegistry';

export interface MenuItemProps {
  /** Menu item configuration */
  item: MenuItemConfig;
  /** Whether this item is keyboard-focused */
  isFocused: boolean;
  /** Callback when menu closes */
  onClose: () => void;
}

/**
 * Format shortcut for display
 * Converts 'Cmd' to '⌘' on macOS, 'Shift' to '⇧', etc.
 */
function formatShortcut(shortcut: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (isMac) {
    return shortcut
      .replace(/Cmd/g, '⌘')
      .replace(/Shift/g, '⇧')
      .replace(/Alt/g, '⌥')
      .replace(/Ctrl/g, '⌃')
      .replace(/\+/g, '');
  }

  return shortcut.replace(/Cmd/g, 'Ctrl').replace(/\+/g, '+');
}

/**
 * Menu Item Component
 */
export const MenuItemComponent: React.FC<MenuItemProps> = ({
  item,
  isFocused,
  onClose,
}) => {
  const itemRef = useRef<HTMLButtonElement>(null);
  const isDisabled = item.disabled?.();

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isFocused]);

  const handleClick = () => {
    if (!isDisabled) {
      item.action();
      onClose();
    }
  };

  const handleMouseEnter = () => {
    itemRef.current?.focus();
  };

  const baseClasses = [
    'w-full',
    'flex',
    'items-center',
    'justify-between',
    'gap-3',
    'px-3',
    'py-1.5',
    'text-sm',
    'text-left',
    'transition-colors',
    'duration-150',
    'ease-out',
  ].join(' ');

  const stateClasses = isDisabled
    ? 'cursor-not-allowed opacity-50'
    : item.danger
      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
      : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-700';

  const focusClasses =
    isFocused && !isDisabled
      ? item.danger
        ? 'bg-red-50 dark:bg-red-950/30'
        : 'bg-zinc-100 dark:bg-zinc-700'
      : '';

  return (
    <button
      ref={itemRef}
      role="menuitem"
      disabled={isDisabled}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={`${baseClasses} ${stateClasses} ${focusClasses}`}
    >
      <span className="flex items-center gap-2">
        {item.icon && (
          <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>
        )}
        <span>{item.label}</span>
      </span>
      {item.shortcut && (
        <span className="flex-shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
          {formatShortcut(item.shortcut)}
        </span>
      )}
    </button>
  );
};
