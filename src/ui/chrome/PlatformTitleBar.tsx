import { detectPlatformChrome } from './platform';
import { MacTitleBar } from './MacTitleBar';
import { WindowsTitleBar } from './WindowsTitleBar';
import type { AppChromeModel } from './chromeState';

type PlatformTitleBarProps = {
  chrome: AppChromeModel;
};

export function PlatformTitleBar({ chrome }: PlatformTitleBarProps) {
  const platform = detectPlatformChrome();

  if (platform === 'macos') {
    return <MacTitleBar chrome={chrome} />;
  }

  return <WindowsTitleBar chrome={chrome} />;
}
