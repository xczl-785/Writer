/**
 * Context Menu Module
 *
 * A complete context menu system following V5 UI/UX specification.
 *
 * @see docs/current/UI/UI_UX规范.md - 3.1 上下文菜单
 * @see docs/current/DEV/架构方案与技术风险评估.md - 4.2.1 右键菜单注册中心
 */

export { ContextMenu } from './ContextMenu';
export type { ContextMenuProps } from './ContextMenu';

export { MenuItemComponent } from './MenuItem';
export type { MenuItemProps } from './MenuItem';

export { MenuDivider } from './MenuDivider';

export {
  contextMenuRegistry,
  isDivider,
  isMenuItem,
  divider,
} from './contextMenuRegistry';
export type {
  MenuItemConfig,
  MenuDividerConfig,
  MenuItem,
  ContextMenuConfig,
} from './contextMenuRegistry';

export { useContextMenu, createContextMenuHandler } from './useContextMenu';
export type { ContextMenuState, UseContextMenuResult } from './useContextMenu';
