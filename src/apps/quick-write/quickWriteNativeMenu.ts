import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { QuickWriteMenuCommand } from './quickWriteMenu';

export const QUICK_WRITE_NATIVE_MENU_EVENT = 'writer://menu-command';

type NativeMenuPayload = {
  id?: string;
};

const QUICK_WRITE_NATIVE_COMMANDS: ReadonlyMap<string, QuickWriteMenuCommand> =
  new Map([
    ['menu.quick_write.open_file', 'file.open'],
    ['menu.quick_write.save_to', 'file.saveTo'],
    ['menu.quick_write.export_html', 'file.exportHtml'],
    ['menu.quick_write.print_to_pdf', 'file.printToPdf'],
    ['menu.quick_write.new_window', 'file.newWindow'],
    ['menu.quick_write.close', 'file.close'],
    ['menu.quick_write.edit_undo', 'edit.undo'],
    ['menu.quick_write.edit_cut', 'edit.cut'],
    ['menu.quick_write.edit_copy', 'edit.copy'],
    ['menu.quick_write.edit_paste', 'edit.paste'],
    ['menu.quick_write.edit_select_all', 'edit.selectAll'],
    ['menu.quick_write.edit_find', 'edit.find'],
    ['menu.quick_write.edit_replace', 'edit.replace'],
    ['menu.quick_write.format_bold', 'format.bold'],
    ['menu.quick_write.format_italic', 'format.italic'],
    ['menu.quick_write.format_link', 'format.link'],
    ['menu.quick_write.paragraph_body', 'paragraph.body'],
    ['menu.quick_write.paragraph_heading', 'paragraph.heading'],
    ['menu.quick_write.paragraph_bulleted_list', 'paragraph.bulletedList'],
    ['menu.quick_write.paragraph_numbered_list', 'paragraph.numberedList'],
    ['menu.quick_write.paragraph_table', 'paragraph.table'],
  ]);

export const resolveQuickWriteNativeMenuCommand = (
  id: string,
): QuickWriteMenuCommand | null => QUICK_WRITE_NATIVE_COMMANDS.get(id) ?? null;

export function useQuickWriteNativeMenuBridge(
  onCommand: (command: QuickWriteMenuCommand) => void,
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
            const command = resolveQuickWriteNativeMenuCommand(id);
            if (command) {
              onCommand(command);
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
  }, [onCommand]);
}
