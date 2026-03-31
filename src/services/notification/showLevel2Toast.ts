import {
  useNotificationStore,
  type NotificationTone,
  type NotificationAction,
} from '../../state/slices/notificationSlice';

type ShowLevel2ToastParams = {
  tone: NotificationTone;
  source: string;
  reason: string;
  suggestion?: string;
  dedupeKey?: string;
  actions?: NotificationAction[];
  ttlMs?: number;
};

const DEFAULT_TTL: Record<NotificationTone, number> = {
  success: 2500,
  info: 3000,
  warning: 4000,
  error: 5000,
};

export function showLevel2Toast({
  tone,
  source,
  reason,
  suggestion = '',
  dedupeKey = source,
  actions,
  ttlMs,
}: ShowLevel2ToastParams): void {
  useNotificationStore.getState().showNotification({
    level: 'level2',
    tone,
    source,
    category: 'user',
    reason,
    suggestion,
    dedupeKey,
    actions,
    ttlMs: ttlMs ?? DEFAULT_TTL[tone],
  });
}
