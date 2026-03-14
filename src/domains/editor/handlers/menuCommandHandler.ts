/**
 * Editor menu command handler
 *
 * Handles menu commands from the native menu bar.
 */
import type { Editor } from '@tiptap/react';
import { t } from '../../../shared/i18n';
import { DEFAULT_TABLE_INSERT } from '../core/constants';
import { applyLinkAction } from '../hooks/linkActions';
import { applyImageAction } from '../hooks/imageActions';

export type MenuCommandHandler = (event: Event) => void;

export function createMenuCommandHandler(
  editor: Editor,
  findReplace: { openFindPanel: (mode: 'find' | 'replace') => void },
  setStatus: (status: 'idle' | 'error', message: string) => void,
  setIsOutlineOpen: (value: boolean | ((prev: boolean) => boolean)) => void,
): MenuCommandHandler {
  const execDocumentCommand = (command: 'cut' | 'copy' | 'paste'): boolean =>
    typeof document.execCommand === 'function' && document.execCommand(command);

  const runEditorCommand = (execute: () => boolean): void => {
    const ran = execute();
    if (!ran) {
      setStatus('error', t('status.menu.unavailable'));
    }
  };

  const execClipboardCommand = (command: 'cut' | 'copy' | 'paste'): void => {
    editor.chain().focus().run();

    if (execDocumentCommand(command)) {
      return;
    }

    setStatus('error', t('status.menu.clipboardDenied'));
  };

  return (event: Event) => {
    const detail = (event as CustomEvent<{ id?: string }>).detail;
    const id = detail?.id;
    if (!id) return;

    switch (id) {
      case 'edit.undo':
        runEditorCommand(() => editor.chain().focus().undo().run());
        return;
      case 'edit.redo':
        runEditorCommand(() => editor.chain().focus().redo().run());
        return;
      case 'edit.cut':
        execClipboardCommand('cut');
        return;
      case 'edit.copy':
        execClipboardCommand('copy');
        return;
      case 'edit.paste':
        execClipboardCommand('paste');
        return;
      case 'edit.select_all':
        runEditorCommand(() => editor.chain().focus().selectAll().run());
        return;
      case 'edit.find':
        findReplace.openFindPanel('find');
        return;
      case 'edit.replace':
        findReplace.openFindPanel('replace');
        return;
      case 'format.bold':
        runEditorCommand(() => editor.chain().focus().toggleBold().run());
        return;
      case 'format.italic':
        runEditorCommand(() => editor.chain().focus().toggleItalic().run());
        return;
      case 'format.inline_code':
        runEditorCommand(() => editor.chain().focus().toggleCode().run());
        return;
      case 'format.strike':
        runEditorCommand(() => editor.chain().focus().toggleStrike().run());
        return;
      case 'format.underline':
        runEditorCommand(() => editor.chain().focus().toggleUnderline().run());
        return;
      case 'format.highlight':
        runEditorCommand(() => editor.chain().focus().toggleHighlight().run());
        return;
      case 'format.link':
        if (applyLinkAction(editor) === 'unavailable') {
          setStatus('error', t('status.menu.unavailable'));
        }
        return;
      case 'format.image':
        void applyImageAction(editor).then((result) => {
          if (result === 'unavailable') {
            setStatus('error', t('status.menu.unavailable'));
          }
        });
        return;
      case 'paragraph.heading_1':
        runEditorCommand(() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
        );
        return;
      case 'paragraph.heading_2':
        runEditorCommand(() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        );
        return;
      case 'paragraph.heading_3':
        runEditorCommand(() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
        );
        return;
      case 'paragraph.heading_4':
        runEditorCommand(() =>
          editor.chain().focus().toggleHeading({ level: 4 }).run(),
        );
        return;
      case 'paragraph.heading_5':
        runEditorCommand(() =>
          editor.chain().focus().toggleHeading({ level: 5 }).run(),
        );
        return;
      case 'paragraph.heading_6':
        runEditorCommand(() =>
          editor.chain().focus().toggleHeading({ level: 6 }).run(),
        );
        return;
      case 'paragraph.blockquote':
        runEditorCommand(() => editor.chain().focus().toggleBlockquote().run());
        return;
      case 'paragraph.code_block':
        runEditorCommand(() => editor.chain().focus().toggleCodeBlock().run());
        return;
      case 'paragraph.unordered_list':
        runEditorCommand(() => editor.chain().focus().toggleBulletList().run());
        return;
      case 'paragraph.ordered_list':
        runEditorCommand(() =>
          editor.chain().focus().toggleOrderedList().run(),
        );
        return;
      case 'paragraph.task_list':
        runEditorCommand(() => editor.chain().focus().toggleTaskList().run());
        return;
      case 'paragraph.horizontal_rule':
        runEditorCommand(() =>
          editor.chain().focus().setHorizontalRule().run(),
        );
        return;
      case 'paragraph.table':
        runEditorCommand(() =>
          editor.chain().focus().insertTable(DEFAULT_TABLE_INSERT).run(),
        );
        return;
      case 'view.outline':
        setIsOutlineOpen((prev) => !prev);
        return;
      default:
        return;
    }
  };
}
