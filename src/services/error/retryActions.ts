import type { NotificationAction } from '../../state/slices/notificationSlice';
import { t } from '../../shared/i18n';

export function createRetryAction(run: () => void): NotificationAction {
  return {
    label: t('error.retry'),
    run,
  };
}
