import type { ReactNode } from 'react';
import { detectPlatformChrome } from './platform';
import { MacTitleBar } from './MacTitleBar';
import { WindowsTitleBar } from './WindowsTitleBar';
import type { AppChromeModel } from './chromeState';

type PlatformTitleBarProps = {
  chrome: AppChromeModel;
  menuBar?: ReactNode;
};

export function PlatformTitleBar({ chrome, menuBar }: PlatformTitleBarProps) {
  const platform = detectPlatformChrome();

  if (platform === 'macos') {
    return <MacTitleBar chrome={chrome} menuBar={menuBar} />;
  }

  return <WindowsTitleBar chrome={chrome} menuBar={menuBar} />;
}
