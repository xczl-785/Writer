import { create } from 'zustand';

export type NotificationLevel = 'level1' | 'level2' | 'level3';
export type NotificationCategory = 'user' | 'system' | 'network' | 'permission';

export interface NotificationAction {
  label: string;
  run: () => void;
}

export interface NotificationItem {
  id: string;
  level: NotificationLevel;
  source: string;
  category: NotificationCategory;
  reason: string;
  suggestion: string;
  actions?: NotificationAction[];
  dedupeKey?: string;
  ttlMs?: number;
  blocking?: boolean;
  createdAt: number;
}

export interface NotificationState {
  level1Notification: NotificationItem | null;
  level2Notification: NotificationItem | null;
  level3Notification: NotificationItem | null;
}

export interface NotificationActions {
  showNotification: (
    input: Omit<NotificationItem, 'id' | 'createdAt'>,
  ) => NotificationItem;
  dismissNotification: (id: string) => void;
  dismissLevel1: (source?: string) => void;
  dismissLevel2: () => void;
  dismissLevel3: () => void;
  clearNotifications: () => void;
}

const createNotificationId = (): string =>
  `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const mergeNotification = (
  previous: NotificationItem,
  next: Omit<NotificationItem, 'id' | 'createdAt'>,
): NotificationItem => ({
  ...previous,
  ...next,
  id: previous.id,
  createdAt: Date.now(),
});

export const useNotificationStore = create<
  NotificationState & NotificationActions
>((set, get) => ({
  level1Notification: null,
  level2Notification: null,
  level3Notification: null,

  showNotification: (input) => {
    const state = get();
    const current =
      input.level === 'level1'
        ? state.level1Notification
        : input.level === 'level2'
          ? state.level2Notification
          : state.level3Notification;

    const notification =
      current && input.dedupeKey && current.dedupeKey === input.dedupeKey
        ? mergeNotification(current, input)
        : {
            ...input,
            id: createNotificationId(),
            createdAt: Date.now(),
          };

    set({
      level1Notification:
        input.level === 'level1' ? notification : state.level1Notification,
      level2Notification:
        input.level === 'level2' ? notification : state.level2Notification,
      level3Notification:
        input.level === 'level3' ? notification : state.level3Notification,
    });

    return notification;
  },

  dismissNotification: (id) =>
    set((state) => ({
      level1Notification:
        state.level1Notification?.id === id ? null : state.level1Notification,
      level2Notification:
        state.level2Notification?.id === id ? null : state.level2Notification,
      level3Notification:
        state.level3Notification?.id === id ? null : state.level3Notification,
    })),

  dismissLevel1: (source) =>
    set((state) => ({
      level1Notification:
        !state.level1Notification ||
        (source && state.level1Notification.source !== source)
          ? state.level1Notification
          : null,
    })),

  dismissLevel2: () => set({ level2Notification: null }),
  dismissLevel3: () => set({ level3Notification: null }),

  clearNotifications: () =>
    set({
      level1Notification: null,
      level2Notification: null,
      level3Notification: null,
    }),
}));
