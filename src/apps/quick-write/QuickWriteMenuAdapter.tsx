import { useEffect, useMemo } from 'react';
import { SchemaMenuBar } from '../../ui/chrome/SchemaMenuBar';
import {
  WINDOWS_MENU_SCHEMA,
  type MenuSchemaGroup,
  type MenuSchemaItem,
} from '../../ui/chrome/menuSchema';
import { menuCommandBus } from '../../core/command/menuCommandBus';
import type { QuickWriteCommand } from './quickWriteCommands';

type QuickWriteMenuAdapterProps = {
  disabled: boolean;
  hasEditableDocument: boolean;
  onCommand: (command: QuickWriteCommand) => void;
};

type QuickWriteMenuCommandEntry = {
  menuId: string;
  command: QuickWriteCommand;
};

const fromWriterSchema = (id: string): MenuSchemaItem => {
  const item = WINDOWS_MENU_SCHEMA.flatMap((group) => group.items).find(
    (candidate) => candidate.id === id,
  );
  if (!item) {
    throw new Error(`Writer menu schema item not found: ${id}`);
  }
  return item;
};

const separator = (id: string): MenuSchemaItem => ({
  id,
  labelKey: id,
  fallbackLabels: { 'zh-CN': '', 'en-US': '' },
  separator: true,
});

const quickWriteItem = (
  id: string,
  fallbackLabels: MenuSchemaItem['fallbackLabels'],
  accelerator?: string,
): MenuSchemaItem => ({
  id,
  labelKey: id,
  fallbackLabels,
  accelerator,
});

const QUICK_WRITE_MENU_SCHEMA: MenuSchemaGroup[] = [
  {
    id: 'menu.file',
    labelKey: 'menu.file',
    fallbackLabels: { 'zh-CN': '文件', 'en-US': 'File' },
    platforms: ['windows', 'macos'],
    items: [
      fromWriterSchema('menu.file.open_file'),
      quickWriteItem(
        'menu.file.save_to',
        { 'zh-CN': '保存到…', 'en-US': 'Save To…' },
        'Ctrl+S',
      ),
      separator('separator.quick_write.file.1'),
      quickWriteItem(
        'menu.file.new_window',
        { 'zh-CN': '新建随手写窗口', 'en-US': 'New QuickWrite Window' },
        'Ctrl+Shift+N',
      ),
      quickWriteItem(
        'menu.file.close',
        { 'zh-CN': '关闭', 'en-US': 'Close' },
        'Ctrl+W',
      ),
      separator('separator.quick_write.file.2'),
      fromWriterSchema('menu.file.settings'),
    ],
  },
  {
    id: 'menu.edit',
    labelKey: 'menu.edit',
    fallbackLabels: { 'zh-CN': '编辑', 'en-US': 'Edit' },
    platforms: ['windows', 'macos'],
    items: [
      fromWriterSchema('menu.edit.undo'),
      fromWriterSchema('menu.edit.redo'),
      separator('separator.quick_write.edit.1'),
      fromWriterSchema('menu.edit.cut'),
      fromWriterSchema('menu.edit.copy'),
      fromWriterSchema('menu.edit.paste'),
      fromWriterSchema('menu.edit.select_all'),
      separator('separator.quick_write.edit.2'),
      fromWriterSchema('menu.edit.find'),
      fromWriterSchema('menu.edit.replace'),
    ],
  },
  {
    id: 'menu.paragraph',
    labelKey: 'menu.paragraph',
    fallbackLabels: { 'zh-CN': '段落', 'en-US': 'Paragraph' },
    platforms: ['windows', 'macos'],
    items: [
      quickWriteItem('menu.paragraph.body', {
        'zh-CN': '正文',
        'en-US': 'Body',
      }),
      quickWriteItem('menu.paragraph.heading', {
        'zh-CN': '标题',
        'en-US': 'Heading',
      }),
      fromWriterSchema('menu.paragraph.unordered_list'),
      fromWriterSchema('menu.paragraph.ordered_list'),
      fromWriterSchema('menu.paragraph.table'),
    ],
  },
  {
    id: 'menu.format',
    labelKey: 'menu.format',
    fallbackLabels: { 'zh-CN': '格式', 'en-US': 'Format' },
    platforms: ['windows', 'macos'],
    items: [
      fromWriterSchema('menu.format.bold'),
      fromWriterSchema('menu.format.italic'),
      fromWriterSchema('menu.format.link'),
    ],
  },
];

export const QUICK_WRITE_MENU_COMMANDS: QuickWriteMenuCommandEntry[] = [
  { menuId: 'menu.file.open_file', command: 'file.open' },
  { menuId: 'menu.file.save_to', command: 'file.saveTo' },
  { menuId: 'menu.file.new_window', command: 'file.newWindow' },
  { menuId: 'menu.file.close', command: 'file.close' },
  { menuId: 'menu.file.settings', command: 'file.settings' },
  { menuId: 'menu.edit.undo', command: 'edit.undo' },
  { menuId: 'menu.edit.redo', command: 'edit.redo' },
  { menuId: 'menu.edit.cut', command: 'edit.cut' },
  { menuId: 'menu.edit.copy', command: 'edit.copy' },
  { menuId: 'menu.edit.paste', command: 'edit.paste' },
  { menuId: 'menu.edit.select_all', command: 'edit.selectAll' },
  { menuId: 'menu.edit.find', command: 'edit.find' },
  { menuId: 'menu.edit.replace', command: 'edit.replace' },
  { menuId: 'menu.format.bold', command: 'format.bold' },
  { menuId: 'menu.format.italic', command: 'format.italic' },
  { menuId: 'menu.format.link', command: 'format.link' },
  { menuId: 'menu.paragraph.body', command: 'paragraph.body' },
  { menuId: 'menu.paragraph.heading', command: 'paragraph.heading' },
  {
    menuId: 'menu.paragraph.unordered_list',
    command: 'paragraph.bulletedList',
  },
  {
    menuId: 'menu.paragraph.ordered_list',
    command: 'paragraph.numberedList',
  },
  { menuId: 'menu.paragraph.table', command: 'paragraph.table' },
];

export const QUICK_WRITE_NATIVE_MENU_TO_SCHEMA_ID: ReadonlyMap<string, string> =
  new Map([
    ['menu.quick_write.open_file', 'menu.file.open_file'],
    ['menu.quick_write.save_to', 'menu.file.save_to'],
    ['menu.quick_write.new_window', 'menu.file.new_window'],
    ['menu.quick_write.close', 'menu.file.close'],
    ['menu.quick_write.settings', 'menu.file.settings'],
    ['menu.quick_write.edit_undo', 'menu.edit.undo'],
    ['menu.quick_write.edit_redo', 'menu.edit.redo'],
    ['menu.quick_write.edit_cut', 'menu.edit.cut'],
    ['menu.quick_write.edit_copy', 'menu.edit.copy'],
    ['menu.quick_write.edit_paste', 'menu.edit.paste'],
    ['menu.quick_write.edit_select_all', 'menu.edit.select_all'],
    ['menu.quick_write.edit_find', 'menu.edit.find'],
    ['menu.quick_write.edit_replace', 'menu.edit.replace'],
    ['menu.quick_write.format_bold', 'menu.format.bold'],
    ['menu.quick_write.format_italic', 'menu.format.italic'],
    ['menu.quick_write.format_link', 'menu.format.link'],
    ['menu.quick_write.paragraph_body', 'menu.paragraph.body'],
    ['menu.quick_write.paragraph_heading', 'menu.paragraph.heading'],
    [
      'menu.quick_write.paragraph_bulleted_list',
      'menu.paragraph.unordered_list',
    ],
    ['menu.quick_write.paragraph_numbered_list', 'menu.paragraph.ordered_list'],
    ['menu.quick_write.paragraph_table', 'menu.paragraph.table'],
  ]);

const menuCommandById = new Map(
  QUICK_WRITE_MENU_COMMANDS.map((entry) => [entry.menuId, entry.command]),
);

export const resolveQuickWriteMenuCommand = (
  menuId: string,
): QuickWriteCommand | null => menuCommandById.get(menuId) ?? null;

export const resolveQuickWriteNativeMenuSchemaId = (
  nativeId: string,
): string | null => QUICK_WRITE_NATIVE_MENU_TO_SCHEMA_ID.get(nativeId) ?? null;

export const createQuickWriteMenuSchema = (): MenuSchemaGroup[] =>
  QUICK_WRITE_MENU_SCHEMA;

export function registerQuickWriteMenuCommands(
  onCommand: (command: QuickWriteCommand) => void,
): () => void {
  const cleanups = QUICK_WRITE_MENU_COMMANDS.map(({ menuId, command }) =>
    menuCommandBus.register(menuId, () => onCommand(command)),
  );
  return () => cleanups.forEach((cleanup) => cleanup());
}

export function QuickWriteMenuAdapter({
  disabled,
  hasEditableDocument,
  onCommand,
}: QuickWriteMenuAdapterProps) {
  const groups = useMemo(() => createQuickWriteMenuSchema(), []);

  useEffect(() => registerQuickWriteMenuCommands(onCommand), [onCommand]);

  return (
    <SchemaMenuBar
      groups={groups}
      isItemEnabled={(item) => {
        if (item.enabled === false || item.separator) {
          return false;
        }
        if (item.id === 'menu.file.settings') {
          return true;
        }
        if (disabled) {
          return false;
        }
        if (
          item.id === 'menu.file.open_file' ||
          item.id === 'menu.file.new_window'
        ) {
          return true;
        }
        return hasEditableDocument;
      }}
    />
  );
}
