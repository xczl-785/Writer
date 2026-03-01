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

export interface TableContextMenuActions {
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onDeleteRow: () => void;
  onInsertColumnLeft: () => void;
  onInsertColumnRight: () => void;
  onDeleteColumn: () => void;
  onMergeCells: () => void;
  onSplitCell: () => void;
  onToggleHeaderRow: () => void;
  onToggleHeaderColumn: () => void;
  onDeleteTable: () => void;
  canInsertRowAbove: () => boolean;
  canInsertRowBelow: () => boolean;
  canDeleteRow: () => boolean;
  canInsertColumnLeft: () => boolean;
  canInsertColumnRight: () => boolean;
  canDeleteColumn: () => boolean;
  canMergeCells: () => boolean;
  canSplitCell: () => boolean;
  canToggleHeaderRow: () => boolean;
  canToggleHeaderColumn: () => boolean;
  canDeleteTable: () => boolean;
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

export function getTableContextMenuItems(
  actions: TableContextMenuActions,
): MenuItem[] {
  return [
    {
      id: 'insert-row-above',
      label: 'Insert Row Above',
      icon: <Rows3 size={14} />,
      action: actions.onInsertRowAbove,
      disabled: () => !actions.canInsertRowAbove(),
    },
    {
      id: 'insert-row-below',
      label: 'Insert Row Below',
      icon: <Rows3 size={14} />,
      action: actions.onInsertRowBelow,
      disabled: () => !actions.canInsertRowBelow(),
    },
    {
      id: 'delete-row',
      label: 'Delete Row',
      icon: <Rows3 size={14} />,
      action: actions.onDeleteRow,
      disabled: () => !actions.canDeleteRow(),
    },
    divider(),
    {
      id: 'insert-column-left',
      label: 'Insert Column Left',
      icon: <Table2 size={14} />,
      action: actions.onInsertColumnLeft,
      disabled: () => !actions.canInsertColumnLeft(),
    },
    {
      id: 'insert-column-right',
      label: 'Insert Column Right',
      icon: <Table2 size={14} />,
      action: actions.onInsertColumnRight,
      disabled: () => !actions.canInsertColumnRight(),
    },
    {
      id: 'delete-column',
      label: 'Delete Column',
      icon: <Table2 size={14} />,
      action: actions.onDeleteColumn,
      disabled: () => !actions.canDeleteColumn(),
    },
    divider(),
    {
      id: 'merge-cells',
      label: 'Merge Cells',
      icon: <Table2 size={14} />,
      action: actions.onMergeCells,
      disabled: () => !actions.canMergeCells(),
    },
    {
      id: 'split-cell',
      label: 'Split Cell',
      icon: <Table2 size={14} />,
      action: actions.onSplitCell,
      disabled: () => !actions.canSplitCell(),
    },
    divider(),
    {
      id: 'toggle-header-row',
      label: 'Toggle Header Row',
      icon: <Type size={14} />,
      action: actions.onToggleHeaderRow,
      disabled: () => !actions.canToggleHeaderRow(),
    },
    {
      id: 'toggle-header-column',
      label: 'Toggle Header Column',
      icon: <Type size={14} />,
      action: actions.onToggleHeaderColumn,
      disabled: () => !actions.canToggleHeaderColumn(),
    },
    divider(),
    {
      id: 'delete-table',
      label: 'Delete Table',
      icon: <Table2 size={14} />,
      danger: true,
      action: actions.onDeleteTable,
      disabled: () => !actions.canDeleteTable(),
    },
  ];
}
