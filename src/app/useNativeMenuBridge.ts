import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  menuCommandBus,
  type MenuCommandPayload,
} from '../ui/commands/menuCommandBus';

export function useNativeMenuBridge(onUnknownCommand: (id: string) => void) {
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const setup = async () => {
      try {
        const unlisten = await listen<MenuCommandPayload>(
          'writer://menu-command',
          (event) => {
            if (disposed) return;
            const id = event.payload?.id;
            if (!id) return;
            if (!menuCommandBus.dispatch(id)) {
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
  }, [onUnknownCommand]);
}
