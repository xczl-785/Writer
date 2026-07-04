import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { menuCommandBus } from '../../core/command/menuCommandBus';
import type { QuickWriteCommand } from './quickWriteCommands';
import {
  resolveQuickWriteMenuCommand,
  resolveQuickWriteNativeMenuSchemaId,
} from './QuickWriteMenuAdapter';

export const QUICK_WRITE_NATIVE_MENU_EVENT = 'writer://menu-command';

type NativeMenuPayload = {
  id?: string;
};

export const resolveQuickWriteNativeMenuCommand = (
  id: string,
): QuickWriteCommand | null => {
  const menuId = resolveQuickWriteNativeMenuSchemaId(id);
  return menuId ? resolveQuickWriteMenuCommand(menuId) : null;
};

export function useQuickWriteNativeMenuBridge(
  onFallbackCommand?: (command: QuickWriteCommand) => void,
) {
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const setup = async () => {
      try {
        const unlisten = await listen<NativeMenuPayload>(
          QUICK_WRITE_NATIVE_MENU_EVENT,
          (event) => {
            if (disposed) {
              return;
            }
            const id = event.payload?.id;
            if (!id) {
              return;
            }
            const menuId = resolveQuickWriteNativeMenuSchemaId(id);
            if (!menuId) {
              return;
            }
            if (menuCommandBus.dispatch(menuId)) {
              return;
            }
            const command = resolveQuickWriteMenuCommand(menuId);
            if (command) {
              onFallbackCommand?.(command);
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
      cleanup?.();
    };
  }, [onFallbackCommand]);
}
