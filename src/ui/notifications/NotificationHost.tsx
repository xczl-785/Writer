import { useEffect } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { useNotificationStore } from '../../state/slices/notificationSlice';
import './NotificationHost.css';

type NotificationHostProps = {
  scope: 'global' | 'editor';
};

export function NotificationHost({ scope }: NotificationHostProps) {
  const level2Notification = useNotificationStore(
    (state) => state.level2Notification,
  );
  const level3Notification = useNotificationStore(
    (state) => state.level3Notification,
  );
  const dismissLevel2 = useNotificationStore((state) => state.dismissLevel2);
  const dismissLevel3 = useNotificationStore((state) => state.dismissLevel3);

  useEffect(() => {
    if (scope !== 'global' || !level2Notification) {
      return;
    }

    const ttlMs = level2Notification.ttlMs ?? 4000;
    const timer = window.setTimeout(() => {
      dismissLevel2();
    }, ttlMs);

    return () => window.clearTimeout(timer);
  }, [dismissLevel2, level2Notification, scope]);

  if (scope === 'global') {
    if (!level2Notification) {
      return null;
    }

    return (
      <div className="notification-host notification-host__toast-region">
        <div className="notification-card mt-4 flex min-h-[52px] items-center gap-3 rounded-full border border-zinc-200 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-md">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-800">
              {level2Notification.reason}
            </p>
          </div>
          {level2Notification.actions?.map((action) => (
            <button
              key={action.label}
              type="button"
              className="rounded-full px-2 py-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              onClick={() => {
                action.run();
                dismissLevel2();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!level3Notification) {
    return null;
  }

  return (
    <div className="notification-host notification-host__editor-region">
      <div className="notification-card mx-4 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-900">
              {level3Notification.reason}
            </p>
            <p className="mt-1 text-sm text-red-800/80">
              {level3Notification.suggestion}
            </p>
            {level3Notification.actions?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {level3Notification.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-100"
                    onClick={action.run}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="rounded-full p-1 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
            onClick={dismissLevel3}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
