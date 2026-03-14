import { Copy, Quote, Rows3, Table2, Type } from 'lucide-react';
import type { MenuItem } from './contextMenuRegistry';
import { divider } from './contextMenuRegistry';
import { t } from '../../../shared/i18n';

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
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onToggleCellBorder: () => void;
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
  canAlignLeft: () => boolean;
  canAlignCenter: () => boolean;
  canAlignRight: () => boolean;
  canToggleCellBorder: () => boolean;
  canDeleteTable: () => boolean;
}

export function getEditorContextMenuItems(
  actions: EditorContextMenuActions,
): MenuItem[] {
  return [
    {
      id: 'paste',
      label: t('editor.paste'),
      shortcut: 'Cmd+V',
      icon: <Copy size={14} />,
      action: actions.onPaste,
    },
    {
      id: 'select-all',
      label: t('editor.selectAll'),
      shortcut: 'Cmd+A',
      icon: <Type size={14} />,
      action: actions.onSelectAll,
    },
    {
      id: 'copy-full-text',
      label: t('editor.copyFullText'),
      icon: <Rows3 size={14} />,
      action: actions.onCopyFullText,
    },
    divider(),
    {
      id: 'insert-table',
      label: t('editor.insertTable'),
      icon: <Table2 size={14} />,
      action: actions.onInsertTable,
    },
    {
      id: 'insert-quote',
      label: t('editor.insertQuote'),
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
      label: t('editor.copyCodeBlock'),
      icon: <Copy size={14} />,
      action: actions.onCopyCodeBlock,
    },
    {
      id: 'change-language',
      label: t('editor.changeLanguage'),
      icon: <Type size={14} />,
      action: actions.onChangeLanguage,
    },
    {
      id: 'format-code',
      label: t('editor.formatCode'),
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
      label: t('editor.insertRowAbove'),
      icon: <Rows3 size={14} />,
      action: actions.onInsertRowAbove,
      disabled: () => !actions.canInsertRowAbove(),
    },
    {
      id: 'insert-row-below',
      label: t('editor.insertRowBelow'),
      icon: <Rows3 size={14} />,
      action: actions.onInsertRowBelow,
      disabled: () => !actions.canInsertRowBelow(),
    },
    {
      id: 'delete-row',
      label: t('editor.deleteRow'),
      icon: <Rows3 size={14} />,
      action: actions.onDeleteRow,
      disabled: () => !actions.canDeleteRow(),
    },
    divider(),
    {
      id: 'insert-column-left',
      label: t('editor.insertColumnLeft'),
      icon: <Table2 size={14} />,
      action: actions.onInsertColumnLeft,
      disabled: () => !actions.canInsertColumnLeft(),
    },
    {
      id: 'insert-column-right',
      label: t('editor.insertColumnRight'),
      icon: <Table2 size={14} />,
      action: actions.onInsertColumnRight,
      disabled: () => !actions.canInsertColumnRight(),
    },
    {
      id: 'delete-column',
      label: t('editor.deleteColumn'),
      icon: <Table2 size={14} />,
      action: actions.onDeleteColumn,
      disabled: () => !actions.canDeleteColumn(),
    },
    divider(),
    {
      id: 'merge-cells',
      label: t('editor.mergeCells'),
      icon: <Table2 size={14} />,
      action: actions.onMergeCells,
      disabled: () => !actions.canMergeCells(),
    },
    {
      id: 'split-cell',
      label: t('editor.splitCell'),
      icon: <Table2 size={14} />,
      action: actions.onSplitCell,
      disabled: () => !actions.canSplitCell(),
    },
    divider(),
    {
      id: 'toggle-header-row',
      label: t('editor.toggleHeaderRow'),
      icon: <Type size={14} />,
      action: actions.onToggleHeaderRow,
      disabled: () => !actions.canToggleHeaderRow(),
    },
    {
      id: 'toggle-header-column',
      label: t('editor.toggleHeaderColumn'),
      icon: <Type size={14} />,
      action: actions.onToggleHeaderColumn,
      disabled: () => !actions.canToggleHeaderColumn(),
    },
    divider(),
    {
      id: 'align-left',
      label: t('editor.alignLeft'),
      icon: <Type size={14} />,
      action: actions.onAlignLeft,
      disabled: () => !actions.canAlignLeft(),
    },
    {
      id: 'align-center',
      label: t('editor.alignCenter'),
      icon: <Type size={14} />,
      action: actions.onAlignCenter,
      disabled: () => !actions.canAlignCenter(),
    },
    {
      id: 'align-right',
      label: t('editor.alignRight'),
      icon: <Type size={14} />,
      action: actions.onAlignRight,
      disabled: () => !actions.canAlignRight(),
    },
    {
      id: 'toggle-cell-border',
      label: t('editor.toggleCellBorder'),
      icon: <Table2 size={14} />,
      action: actions.onToggleCellBorder,
      disabled: () => !actions.canToggleCellBorder(),
    },
    divider(),
    {
      id: 'delete-table',
      label: t('editor.deleteTable'),
      icon: <Table2 size={14} />,
      danger: true,
      action: actions.onDeleteTable,
      disabled: () => !actions.canDeleteTable(),
    },
  ];
}
