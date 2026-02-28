import { describe, expect, it } from 'vitest';
import {
  getCodeBlockContextMenuItems,
  getEditorContextMenuItems,
} from './editorMenu';
import { isMenuItem } from './contextMenuRegistry';

const noop = () => {};

describe('editorMenu', () => {
  it('returns base editor context items', () => {
    const items = getEditorContextMenuItems({
      onPaste: noop,
      onSelectAll: noop,
      onCopyFullText: noop,
      onInsertTable: noop,
      onInsertQuote: noop,
    });
    const ids = items.filter(isMenuItem).map((item) => item.id);

    expect(ids).toEqual([
      'paste',
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
});
