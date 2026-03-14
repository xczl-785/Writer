/**
 * Context Menu Component
 *
 * A customizable right-click context menu that follows the V5 UI/UX specification.
 * Uses React Portal for proper z-index layering and keyboard navigation support.
 *
 * @see docs/current/UI/UI_UX规范.md - 3.1 上下文菜单
 * @see docs/current/UI/组件规范.md - 3.1 菜单项
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { isDivider, isMenuItem } from './contextMenuRegistry';
import type { MenuItem } from './contextMenuRegistry';
import { MenuItemComponent } from './MenuItem';
import { MenuDivider } from './MenuDivider';

export interface ContextMenuProps {
  /** Whether the menu is visible */
  isOpen: boolean;
  /** X position of the menu */
  x: number;
  /** Y position of the menu */
  y: number;
  /** Menu items to display */
  items: MenuItem[];
  /** Callback when menu closes */
  onClose: () => void;
}

/**
 * Context Menu Component
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  x,
  y,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const viewMargin = 8;
  const menuMaxWidth = 280;
  const menuEstimatedHeight = Math.max(44, items.length * 34 + 12);
  const position = {
    x: Math.max(
      viewMargin,
      Math.min(x, window.innerWidth - menuMaxWidth - viewMargin),
    ),
    y: Math.max(
      viewMargin,
      Math.min(y, window.innerHeight - menuEstimatedHeight - viewMargin),
    ),
  };

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Use setTimeout to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const menuItems = items.filter(isMenuItem);
      const normalizedIndex =
        focusedIndex >= menuItems.length ? -1 : focusedIndex;

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const nextIndex = normalizedIndex + 1;
          if (nextIndex < menuItems.length) {
            setFocusedIndex(nextIndex);
          } else {
            setFocusedIndex(0);
          }
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prevIndex = normalizedIndex - 1;
          if (prevIndex >= 0) {
            setFocusedIndex(prevIndex);
          } else {
            setFocusedIndex(menuItems.length - 1);
          }
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (normalizedIndex >= 0 && normalizedIndex < menuItems.length) {
            const item = menuItems[normalizedIndex];
            const isDisabled = item.disabled?.();
            if (!isDisabled) {
              item.action();
              onClose();
            }
          }
          break;
        }
        case 'Escape': {
          event.preventDefault();
          onClose();
          break;
        }
      }
    },
    [focusedIndex, items, onClose],
  );

  if (!isOpen) return null;
  const menuItems = items.filter(isMenuItem);
  const normalizedFocusedIndex =
    focusedIndex >= menuItems.length ? -1 : focusedIndex;

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed z-50 min-w-[180px] max-w-[280px] rounded-md border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
      style={{
        left: position.x,
        top: position.y,
        animation: 'contextMenuFadeIn 150ms ease-out',
      }}
    >
      <div className="py-1">
        {items.map((item, index) => {
          if (isDivider(item)) {
            return <MenuDivider key={`divider-${index}`} />;
          }

          return (
            <MenuItemComponent
              key={item.id}
              item={item}
              isFocused={
                normalizedFocusedIndex >= 0 &&
                menuItems.indexOf(item) === normalizedFocusedIndex
              }
              onClose={onClose}
            />
          );
        })}
      </div>
    </div>
  );

  return createPortal(menu, document.body);
};

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes contextMenuFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;
document.head.appendChild(style);
