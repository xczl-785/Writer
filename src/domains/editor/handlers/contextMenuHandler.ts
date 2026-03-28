/**
 * Editor context menu handler
 *
 * Handles right-click context menu for editor content.
 */
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Editor } from '@tiptap/react';
import type { MenuItem } from '../../../shared/components/ContextMenu/contextMenuRegistry';
import { readClipboardText } from '../../../services/runtime/ClipboardTextReader';
import {
  getCodeBlockContextMenuItems,
  getEditorContextMenuItems,
  getTableContextMenuItems,
} from '../../../shared/components/ContextMenu/editorMenu';
import { DEFAULT_TABLE_INSERT } from '../core/constants';
import { executePasteCommand, insertClipboardText } from '../integration';

export type ContextMenuOpener = (event: ReactMouseEvent) => void;

export function createContextMenuOpener(
  editor: Editor,
  contextMenu: {
    open: (x: number, y: number, items: MenuItem[]) => void;
  },
  copyText: (text: string, successMessage: string) => Promise<void>,
  setStatus: (status: 'idle' | 'error', message: string) => void,
): ContextMenuOpener {
  const execDocumentCommand = (command: 'copy' | 'paste'): boolean =>
    typeof document.execCommand === 'function' && document.execCommand(command);

  const getActiveCodeBlockText = (instance: Editor) => {
    const { $from } = instance.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name === 'codeBlock') {
        return node.textContent;
      }
    }
    return '';
  };

  const getCurrentCellBorderHidden = (instance: Editor) => {
    const { $from } = instance.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        return Boolean(node.attrs.borderHidden);
      }
    }
    return false;
  };

  return (event: ReactMouseEvent) => {
    event.preventDefault();
    const selection = editor.state.selection;
    const hasSelection = !selection.empty;
    const inTable =
      editor.isActive('table') ||
      editor.isActive('tableRow') ||
      editor.isActive('tableCell') ||
      editor.isActive('tableHeader');

    if (hasSelection && !inTable) {
      return;
    }

    const inCodeBlock = editor.isActive('codeBlock');
    const items = inTable
      ? getTableContextMenuItems({
          onInsertRowAbove: () => {
            editor.chain().focus().addRowBefore().run();
          },
          onInsertRowBelow: () => {
            editor.chain().focus().addRowAfter().run();
          },
          onDeleteRow: () => {
            editor.chain().focus().deleteRow().run();
          },
          onInsertColumnLeft: () => {
            editor.chain().focus().addColumnBefore().run();
          },
          onInsertColumnRight: () => {
            editor.chain().focus().addColumnAfter().run();
          },
          onDeleteColumn: () => {
            editor.chain().focus().deleteColumn().run();
          },
          onMergeCells: () => {
            editor.chain().focus().mergeCells().run();
          },
          onSplitCell: () => {
            editor.chain().focus().splitCell().run();
          },
          onToggleHeaderRow: () => {
            editor.chain().focus().toggleHeaderRow().run();
          },
          onToggleHeaderColumn: () => {
            editor.chain().focus().toggleHeaderColumn().run();
          },
          onAlignLeft: () => {
            editor.chain().focus().setCellAttribute('textAlign', 'left').run();
          },
          onAlignCenter: () => {
            editor
              .chain()
              .focus()
              .setCellAttribute('textAlign', 'center')
              .run();
          },
          onAlignRight: () => {
            editor.chain().focus().setCellAttribute('textAlign', 'right').run();
          },
          onToggleCellBorder: () => {
            const hidden = getCurrentCellBorderHidden(editor);
            editor
              .chain()
              .focus()
              .setCellAttribute('borderHidden', !hidden)
              .run();
          },
          onDeleteTable: () => {
            editor.chain().focus().deleteTable().run();
          },
          canInsertRowAbove: () =>
            editor.can().chain().focus().addRowBefore().run(),
          canInsertRowBelow: () =>
            editor.can().chain().focus().addRowAfter().run(),
          canDeleteRow: () => editor.can().chain().focus().deleteRow().run(),
          canInsertColumnLeft: () =>
            editor.can().chain().focus().addColumnBefore().run(),
          canInsertColumnRight: () =>
            editor.can().chain().focus().addColumnAfter().run(),
          canDeleteColumn: () =>
            editor.can().chain().focus().deleteColumn().run(),
          canMergeCells: () => editor.can().chain().focus().mergeCells().run(),
          canSplitCell: () => editor.can().chain().focus().splitCell().run(),
          canToggleHeaderRow: () =>
            editor.can().chain().focus().toggleHeaderRow().run(),
          canToggleHeaderColumn: () =>
            editor.can().chain().focus().toggleHeaderColumn().run(),
          canAlignLeft: () =>
            editor
              .can()
              .chain()
              .focus()
              .setCellAttribute('textAlign', 'left')
              .run(),
          canAlignCenter: () =>
            editor
              .can()
              .chain()
              .focus()
              .setCellAttribute('textAlign', 'center')
              .run(),
          canAlignRight: () =>
            editor
              .can()
              .chain()
              .focus()
              .setCellAttribute('textAlign', 'right')
              .run(),
          canToggleCellBorder: () =>
            editor
              .can()
              .chain()
              .focus()
              .setCellAttribute('borderHidden', true)
              .run(),
          canDeleteTable: () =>
            editor.can().chain().focus().deleteTable().run(),
        })
      : inCodeBlock
        ? getCodeBlockContextMenuItems({
            onCopyCodeBlock: () => {
              void copyText(getActiveCodeBlockText(editor), 'Code copied');
            },
            onChangeLanguage: () => {
              setStatus('idle', 'Language selector coming soon');
            },
            onFormatCode: () => {
              setStatus('idle', 'Code formatter coming soon');
            },
          })
        : getEditorContextMenuItems({
            onPaste: () => {
              void executePasteCommand({
                focusEditor: () => {
                  editor.chain().focus().run();
                },
                execDocumentCommand: (command) => execDocumentCommand(command),
                readClipboardText,
                insertClipboardText: (text, intent) => {
                  insertClipboardText(editor, text, intent);
                },
                setStatus,
                clipboardDeniedMessage: 'Paste requires clipboard permission',
              });
            },
            onPastePlain: () => {
              void executePasteCommand({
                intent: 'plain',
                focusEditor: () => {
                  editor.chain().focus().run();
                },
                execDocumentCommand: (command) => execDocumentCommand(command),
                readClipboardText,
                insertClipboardText: (text, intent) => {
                  insertClipboardText(editor, text, intent);
                },
                setStatus,
                clipboardDeniedMessage: 'Paste requires clipboard permission',
              });
            },
            onSelectAll: () => {
              editor.chain().focus().selectAll().run();
            },
            onCopyFullText: () => {
              void copyText(editor.getText(), 'Document copied');
            },
            onInsertTable: () => {
              editor.chain().focus().insertTable(DEFAULT_TABLE_INSERT).run();
            },
            onInsertQuote: () => {
              editor.chain().focus().toggleBlockquote().run();
            },
          });

    contextMenu.open(event.clientX, event.clientY, items);
  };
}
