import { detectPlatformChrome } from './platform';
import { MacTitleBar } from './MacTitleBar';
import { WindowsTitleBar } from './WindowsTitleBar';

type PlatformTitleBarProps = {
  hasRecentItems: boolean;
  isSidebarVisible: boolean;
  isFocusZen: boolean;
  isHeaderAwake: boolean;
  onToggleSidebar: () => void;
  onSetFocusZen: (enabled: boolean) => void;
};

export function PlatformTitleBar({
  hasRecentItems,
  isSidebarVisible,
  isFocusZen,
  isHeaderAwake,
  onToggleSidebar,
  onSetFocusZen,
}: PlatformTitleBarProps) {
  const platform = detectPlatformChrome();

  if (platform === 'macos') {
    return (
      <MacTitleBar
        hasRecentItems={hasRecentItems}
        isSidebarVisible={isSidebarVisible}
        isFocusZen={isFocusZen}
        isHeaderAwake={isHeaderAwake}
        onToggleSidebar={onToggleSidebar}
        onSetFocusZen={onSetFocusZen}
      />
    );
  }

  return (
    <WindowsTitleBar
      hasRecentItems={hasRecentItems}
      isSidebarVisible={isSidebarVisible}
      isFocusZen={isFocusZen}
      isHeaderAwake={isHeaderAwake}
      onToggleSidebar={onToggleSidebar}
      onSetFocusZen={onSetFocusZen}
    />
  );
}
