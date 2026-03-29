import { expect } from 'vitest';
import { useNotificationStore } from '../../state/slices/notificationSlice';

export function clearNotificationState(): void {
  useNotificationStore.getState().clearNotifications();
}

export function expectLevel2Notification(
  partial: Partial<NonNullable<ReturnType<typeof useNotificationStore.getState>['level2Notification']>>,
): void {
  expect(useNotificationStore.getState().level2Notification).toMatchObject(
    partial,
  );
}
