import { PlatformTitleBar } from '../ui/chrome';
import type { AppChromeModel } from '../ui/chrome/chromeState';

type AppChromeProps = {
  chrome: AppChromeModel;
};

export function AppChrome({ chrome }: AppChromeProps) {
  return <PlatformTitleBar chrome={chrome} />;
}
