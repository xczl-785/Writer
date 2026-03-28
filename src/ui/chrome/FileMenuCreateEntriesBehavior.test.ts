import { describe, expect, it } from 'vitest';

import { MESSAGES } from '../../shared/i18n/messages';
import { FILE_MENU_CREATE_ITEMS, WINDOWS_MENU_SCHEMA } from './menuSchema';

describe('File menu create entries', () => {
  const fileMenu = WINDOWS_MENU_SCHEMA.find(
    (group) => group.id === 'menu.file',
  );
  const editMenu = WINDOWS_MENU_SCHEMA.find(
    (group) => group.id === 'menu.edit',
  );

  it('defines file and folder create entries via a shared constant', () => {
    expect(FILE_MENU_CREATE_ITEMS).toEqual([
      {
        id: 'menu.file.new',
        labelKey: 'menu.file.new',
        fallbackLabels: { 'zh-CN': '新建文件', 'en-US': 'New File' },
        accelerator: 'Ctrl+N',
      },
      {
        id: 'menu.file.new_folder',
        labelKey: 'menu.file.newFolder',
        fallbackLabels: { 'zh-CN': '新建文件夹', 'en-US': 'New Folder' },
      },
    ]);
  });

  it('keeps create entry fallback labels aligned with i18n messages', () => {
    for (const item of FILE_MENU_CREATE_ITEMS) {
      expect(item.fallbackLabels['zh-CN']).toBe(
        MESSAGES['zh-CN'][item.labelKey],
      );
      expect(item.fallbackLabels['en-US']).toBe(
        MESSAGES['en-US'][item.labelKey],
      );
    }
  });

  it('mounts the shared create entries into the file menu schema', () => {
    expect(fileMenu?.items.slice(0, FILE_MENU_CREATE_ITEMS.length)).toEqual(
      FILE_MENU_CREATE_ITEMS,
    );
  });

  it('defines a dedicated plain paste entry in the edit menu schema', () => {
    const pastePlainItem = editMenu?.items.find(
      (item) => item.id === 'menu.edit.paste_plain',
    );

    expect(pastePlainItem).toEqual({
      id: 'menu.edit.paste_plain',
      labelKey: 'menu.edit.pastePlain',
      fallbackLabels: {
        'zh-CN': MESSAGES['zh-CN']['menu.edit.pastePlain'],
        'en-US': MESSAGES['en-US']['menu.edit.pastePlain'],
      },
      accelerator: 'Ctrl+Shift+V',
    });
  });
});
