import { describe, expect, it } from 'vitest';
import {
  getCodeBlockContextMenuItems,
  getEditorContextMenuItems,
  getTableContextMenuItems,
} from './editorMenu';
import { isMenuItem } from './contextMenuRegistry';

const noop = () => {};

describe('editorMenu', () => {
  it('returns base editor context items', () => {
    const items = getEditorContextMenuItems({
      onPaste: noop,
      onPastePlain: noop,
      onSelectAll: noop,
      onCopyFullText: noop,
      onInsertTable: noop,
      onInsertQuote: noop,
    });
    const ids = items.filter(isMenuItem).map((item) => item.id);

    expect(ids).toEqual([
      'paste',
      'paste-plain',
      'select-all',
      'copy-full-text',
      'insert-table',
      'insert-quote',
    ]);
  });

  it('returns code block specific items', () => {
    const items = getCodeBlockContextMenuItems({
      onCopyCodeBlock: noop,
      onChangeLanguage: noop,
      onFormatCode: noop,
    });
    const ids = items.filter(isMenuItem).map((item) => item.id);

    expect(ids).toEqual(['copy-code-block', 'change-language', 'format-code']);
  });

  it('returns table specific items', () => {
    const items = getTableContextMenuItems({
      onInsertRowAbove: noop,
      onInsertRowBelow: noop,
      onDeleteRow: noop,
      onInsertColumnLeft: noop,
      onInsertColumnRight: noop,
      onDeleteColumn: noop,
      onMergeCells: noop,
      onSplitCell: noop,
      onToggleHeaderRow: noop,
      onToggleHeaderColumn: noop,
      onAlignLeft: noop,
      onAlignCenter: noop,
      onAlignRight: noop,
      onToggleCellBorder: noop,
      onDeleteTable: noop,
      canInsertRowAbove: () => true,
      canInsertRowBelow: () => true,
      canDeleteRow: () => true,
      canInsertColumnLeft: () => true,
      canInsertColumnRight: () => true,
      canDeleteColumn: () => true,
      canMergeCells: () => true,
      canSplitCell: () => true,
      canToggleHeaderRow: () => true,
      canToggleHeaderColumn: () => true,
      canAlignLeft: () => true,
      canAlignCenter: () => true,
      canAlignRight: () => true,
      canToggleCellBorder: () => true,
      canDeleteTable: () => true,
    });
    const ids = items.filter(isMenuItem).map((item) => item.id);

    expect(ids).toEqual([
      'insert-row-above',
      'insert-row-below',
      'delete-row',
      'insert-column-left',
      'insert-column-right',
      'delete-column',
      'merge-cells',
      'split-cell',
      'toggle-header-row',
      'toggle-header-column',
      'align-left',
      'align-center',
      'align-right',
      'toggle-cell-border',
      'delete-table',
    ]);
  });
});
