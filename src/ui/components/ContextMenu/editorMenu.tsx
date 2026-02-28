import { Copy, Quote, Rows3, Table2, Type } from 'lucide-react';
import type { MenuItem } from './contextMenuRegistry';
import { divider } from './contextMenuRegistry';

export interface EditorContextMenuActions {
  onPaste: () => void;
  onSelectAll: () => void;
  onCopyFullText: () => void;
  onInsertTable: () => void;
  onInsertQuote: () => void;
}

export interface CodeBlockContextMenuActions {
  onCopyCodeBlock: () => void;
  onChangeLanguage: () => void;
  onFormatCode: () => void;
}

export function getEditorContextMenuItems(
  actions: EditorContextMenuActions,
): MenuItem[] {
  return [
    {
      id: 'paste',
      label: 'Paste',
      shortcut: 'Cmd+V',
      icon: <Copy size={14} />,
      action: actions.onPaste,
    },
    {
      id: 'select-all',
      label: 'Select All',
      shortcut: 'Cmd+A',
      icon: <Type size={14} />,
      action: actions.onSelectAll,
    },
    {
      id: 'copy-full-text',
      label: 'Copy Full Text',
      icon: <Rows3 size={14} />,
      action: actions.onCopyFullText,
    },
    divider(),
    {
      id: 'insert-table',
      label: 'Insert Table',
      icon: <Table2 size={14} />,
      action: actions.onInsertTable,
    },
    {
      id: 'insert-quote',
      label: 'Insert Quote',
      icon: <Quote size={14} />,
      action: actions.onInsertQuote,
    },
  ];
}

export function getCodeBlockContextMenuItems(
  actions: CodeBlockContextMenuActions,
): MenuItem[] {
  return [
    {
      id: 'copy-code-block',
      label: 'Copy Code Block',
      icon: <Copy size={14} />,
      action: actions.onCopyCodeBlock,
    },
    {
      id: 'change-language',
      label: 'Change Language',
      icon: <Type size={14} />,
      action: actions.onChangeLanguage,
    },
    {
      id: 'format-code',
      label: 'Format Code',
      icon: <Rows3 size={14} />,
      action: actions.onFormatCode,
    },
  ];
}
