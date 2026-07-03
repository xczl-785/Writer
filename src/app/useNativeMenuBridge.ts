import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  menuCommandBus,
  type MenuCommandPayload,
} from '../core/command/menuCommandBus';

export const NATIVE_MENU_COMMAND_EVENT = 'writer://menu-command';

export interface NativeMenuBridgeOptions {
  eventName?: string;
  dispatch?: (id: string) => boolean;
}

export function useNativeMenuBridge(
  onUnknownCommand: (id: string) => void,
  options: NativeMenuBridgeOptions = {},
) {
  const eventName = options.eventName ?? NATIVE_MENU_COMMAND_EVENT;
  const dispatch = options.dispatch ?? menuCommandBus.dispatch;

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const setup = async () => {
      try {
        const unlisten = await listen<MenuCommandPayload>(
          eventName,
          (event) => {
            if (disposed) return;
            const id = event.payload?.id;
            if (!id) return;
            if (!dispatch(id)) {
              onUnknownCommand(id);
            }
          },
        );
        cleanup = unlisten;
      } catch {
        cleanup = null;
      }
    };

    void setup();

    return () => {
      disposed = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, [dispatch, eventName, onUnknownCommand]);
}
