import { StatusBarView } from '../../ui/statusbar/StatusBarView';
import { countCharacters } from '../../ui/statusbar/statusBarUtils';
import type {
  SaveErrorDetails,
  SaveStatus,
} from '../../state/slices/statusSlice';

type QuickWriteStatusBarProps = {
  activeError: SaveErrorDetails | null;
  charactersCount: number;
  displayStatus: SaveStatus;
  encodingLabel: string;
  message: string | null;
};

export function QuickWriteStatusBar({
  activeError,
  charactersCount,
  displayStatus,
  encodingLabel,
  message,
}: QuickWriteStatusBarProps) {
  return (
    <StatusBarView
      activeError={activeError}
      charactersCount={charactersCount}
      className="quick-write-shared-status-bar"
      displayStatus={displayStatus}
      encodingLabel={encodingLabel}
      message={message}
      showMessage={false}
    />
  );
}

export const countQuickWriteCharacters = countCharacters;
