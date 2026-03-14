/**
 * useContextMenu Hook
 *
 * Custom hook for managing context menu state and positioning.
 */

import { useState, useCallback } from 'react';
import type { MenuItem } from './contextMenuRegistry';

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}

const initialState: ContextMenuState = {
  isOpen: false,
  x: 0,
  y: 0,
  items: [],
};

export interface UseContextMenuResult {
  /** Current state of the context menu */
  state: ContextMenuState;
  /** Open the context menu at the specified position */
  open: (x: number, y: number, items: MenuItem[]) => void;
  /** Close the context menu */
  close: () => void;
  /** Toggle the context menu */
  toggle: (x: number, y: number, items: MenuItem[]) => void;
}

/**
 * Hook for managing context menu state
 */
export function useContextMenu(): UseContextMenuResult {
  const [state, setState] = useState<ContextMenuState>(initialState);

  const open = useCallback((x: number, y: number, items: MenuItem[]) => {
    setState({ isOpen: true, x, y, items });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const toggle = useCallback(
    (x: number, y: number, items: MenuItem[]) => {
      if (state.isOpen) {
        close();
      } else {
        open(x, y, items);
      }
    },
    [state.isOpen, open, close],
  );

  return { state, open, close, toggle };
}

/**
 * Create a context menu handler for onContextMenu events
 */
export function createContextMenuHandler(
  items: MenuItem[] | (() => MenuItem[]),
  open: (x: number, y: number, items: MenuItem[]) => void,
): (event: React.MouseEvent) => void {
  return (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const resolvedItems = typeof items === 'function' ? items() : items;
    open(event.clientX, event.clientY, resolvedItems);
  };
}
