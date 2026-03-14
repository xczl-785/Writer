/**
 * Context Menu Registry
 *
 * Centralized registry for context menu items across the application.
 * Supports dynamic registration, context-aware menus, and keyboard shortcuts.
 *
 * @see docs/current/DEV/架构方案与技术风险评估.md - 4.2.1 右键菜单注册中心
 */

import type { ReactNode } from 'react';

export interface MenuItemConfig {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label */
  label: string;
  /** Keyboard shortcut (e.g., 'Cmd+N', 'Shift+Cmd+P') */
  shortcut?: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Whether this is a dangerous/destructive action (red styling) */
  danger?: boolean;
  /** Dynamic disabled state */
  disabled?: () => boolean;
  /** Click handler */
  action: () => void;
}

export interface MenuDividerConfig {
  type: 'divider';
}

export type MenuItem = MenuItemConfig | MenuDividerConfig;

export interface ContextMenuConfig {
  /** Context identifier (e.g., 'file-tree', 'editor', 'table') */
  context: string;
  /** Menu items to display */
  items: MenuItem[];
}

/**
 * Check if an item is a divider
 */
export function isDivider(item: MenuItem): item is MenuDividerConfig {
  return 'type' in item && item.type === 'divider';
}

/**
 * Check if an item is a menu item (not a divider)
 */
export function isMenuItem(item: MenuItem): item is MenuItemConfig {
  return !isDivider(item);
}

/**
 * Create a divider configuration
 */
export function divider(): MenuDividerConfig {
  return { type: 'divider' };
}

/**
 * Global registry for context menus
 */
class ContextMenuRegistryImpl {
  private menus: Map<string, MenuItem[]> = new Map();

  /**
   * Register menu items for a context
   */
  register(context: string, items: MenuItem[]): void {
    this.menus.set(context, items);
  }

  /**
   * Unregister a context
   */
  unregister(context: string): void {
    this.menus.delete(context);
  }

  /**
   * Get menu items for a context
   */
  getItems(context: string): MenuItem[] {
    return this.menus.get(context) || [];
  }

  /**
   * Check if a context is registered
   */
  hasContext(context: string): boolean {
    return this.menus.has(context);
  }

  /**
   * Get all registered contexts
   */
  getContexts(): string[] {
    return Array.from(this.menus.keys());
  }

  /**
   * Clear all registered menus
   */
  clear(): void {
    this.menus.clear();
  }
}

export const contextMenuRegistry = new ContextMenuRegistryImpl();
