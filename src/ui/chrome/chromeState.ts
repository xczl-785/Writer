import { isChromeHeaderVisible } from './headerVisibilityPolicy';

export type AppChromeState = {
  hasRecentItems: boolean;
  isSidebarVisible: boolean;
  isFocusZen: boolean;
  isHeaderAwake: boolean;
  isVisible: boolean;
};

export type AppChromeActions = {
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  setFocusZen: (enabled: boolean) => void;
};

export type AppChromeModel = {
  state: AppChromeState;
  actions: AppChromeActions;
};

type CreateAppChromeModelInput = {
  hasRecentItems: boolean;
  isSidebarVisible: boolean;
  isFocusZen: boolean;
  isHeaderAwake: boolean;
  onToggleSidebar: () => void;
  onSetSidebarVisible: (visible: boolean) => void;
  onSetFocusZen: (enabled: boolean) => void;
};

export function createAppChromeModel({
  hasRecentItems,
  isSidebarVisible,
  isFocusZen,
  isHeaderAwake,
  onToggleSidebar,
  onSetSidebarVisible,
  onSetFocusZen,
}: CreateAppChromeModelInput): AppChromeModel {
  return {
    state: {
      hasRecentItems,
      isSidebarVisible,
      isFocusZen,
      isHeaderAwake,
      isVisible: isChromeHeaderVisible({ isFocusZen, isHeaderAwake }),
    },
    actions: {
      toggleSidebar: onToggleSidebar,
      setSidebarVisible: onSetSidebarVisible,
      setFocusZen: onSetFocusZen,
    },
  };
}
