/**
 * Menu Divider Component
 *
 * Visual separator between menu items.
 *
 * @see docs/current/UI/组件规范.md
 */

import React from 'react';

/**
 * Menu Divider Component
 */
export const MenuDivider: React.FC = () => {
  return (
    <div
      role="separator"
      className="my-1 border-t border-zinc-200 dark:border-zinc-700"
    />
  );
};
