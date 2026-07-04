import type { ReactNode } from 'react';
import { PlatformTitleBar } from '../ui/chrome';
import type { AppChromeModel } from '../ui/chrome/chromeState';

type AppChromeProps = {
  chrome: AppChromeModel;
  menuBar?: ReactNode;
};

export function AppChrome({ chrome, menuBar }: AppChromeProps) {
  return <PlatformTitleBar chrome={chrome} menuBar={menuBar} />;
}
