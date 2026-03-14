import { detectPlatformChrome } from './platform';
import { MacTitleBar } from './MacTitleBar';
import { WindowsTitleBar } from './WindowsTitleBar';

type PlatformTitleBarProps = {
  hasRecentItems: boolean;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
};

export function PlatformTitleBar({
  hasRecentItems,
  isSidebarVisible,
  onToggleSidebar,
}: PlatformTitleBarProps) {
  const platform = detectPlatformChrome();

  if (platform === 'macos') {
    return (
      <MacTitleBar
        hasRecentItems={hasRecentItems}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={onToggleSidebar}
      />
    );
  }

  return (
    <WindowsTitleBar
      hasRecentItems={hasRecentItems}
      isSidebarVisible={isSidebarVisible}
      onToggleSidebar={onToggleSidebar}
    />
  );
}
