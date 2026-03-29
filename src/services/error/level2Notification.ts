import { useStatusStore } from '../../state/slices/statusSlice';
import { ErrorService } from './ErrorService';
import type { NotificationAction } from '../../state/slices/notificationSlice';

type ShowLevel2NotificationParams = {
  error: unknown;
  source: string;
  reason: string;
  suggestion: string;
  dedupeKey?: string;
  actions?: NotificationAction[];
};

export function showLevel2Notification({
  error,
  source,
  reason,
  suggestion,
  dedupeKey = source,
  actions,
}: ShowLevel2NotificationParams): void {
  useStatusStore.getState().setStatus('idle', null);
  ErrorService.handleWithInfo(error, source, {
    level: 'level2',
    source,
    reason,
    suggestion,
    dedupeKey,
    actions,
  });
}
