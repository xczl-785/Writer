import { useEffect, useRef } from 'react';

type UseSidebarToggleBehaviorParams = {
  isFocusZen: boolean;
  onToggleSidebar: () => void;
  onSetFocusZen: (enabled: boolean) => void;
  clickDelayMs?: number;
};

type SidebarToggleBehavior = {
  onClick: () => void;
  onDoubleClick: () => void;
};

export type SidebarToggleTimerRef = {
  current: number | null;
};

const DEFAULT_CLICK_DELAY_MS = 220;

export function handleSidebarToggleDoubleClick(
  {
    isFocusZen,
    onSetFocusZen,
  }: Pick<UseSidebarToggleBehaviorParams, 'isFocusZen' | 'onSetFocusZen'>,
  clickTimerRef: SidebarToggleTimerRef,
): void {
  if (clickTimerRef.current !== null) {
    window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
  }
  onSetFocusZen(!isFocusZen);
}

export function handleSidebarToggleClick(
  {
    isFocusZen,
    onToggleSidebar,
    onSetFocusZen,
    clickDelayMs = DEFAULT_CLICK_DELAY_MS,
  }: UseSidebarToggleBehaviorParams,
  clickTimerRef: SidebarToggleTimerRef,
): void {
  if (clickTimerRef.current !== null) {
    window.clearTimeout(clickTimerRef.current);
  }

  clickTimerRef.current = window.setTimeout(() => {
    clickTimerRef.current = null;
    if (isFocusZen) {
      onSetFocusZen(false);
      return;
    }
    onToggleSidebar();
  }, clickDelayMs);
}

export function useSidebarToggleBehavior({
  isFocusZen,
  onToggleSidebar,
  onSetFocusZen,
  clickDelayMs = DEFAULT_CLICK_DELAY_MS,
}: UseSidebarToggleBehaviorParams): SidebarToggleBehavior {
  const clickTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    },
    [],
  );

  function onDoubleClick(): void {
    handleSidebarToggleDoubleClick(
      { isFocusZen, onSetFocusZen },
      clickTimerRef,
    );
  }

  function onClick(): void {
    handleSidebarToggleClick(
      { isFocusZen, onToggleSidebar, onSetFocusZen, clickDelayMs },
      clickTimerRef,
    );
  }

  return {
    onClick,
    onDoubleClick,
  };
}
