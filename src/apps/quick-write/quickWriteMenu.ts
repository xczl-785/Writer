export type QuickWriteMenuCommand =
  | 'file.open'
  | 'file.saveTo'
  | 'file.exportHtml'
  | 'file.printToPdf'
  | 'file.newWindow'
  | 'file.close'
  | 'file.exit'
  | 'edit.undo'
  | 'edit.cut'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.selectAll'
  | 'edit.find'
  | 'edit.replace'
  | 'format.bold'
  | 'format.italic'
  | 'format.link'
  | 'paragraph.body'
  | 'paragraph.heading'
  | 'paragraph.bulletedList'
  | 'paragraph.numberedList'
  | 'paragraph.table';

export interface QuickWriteMenuItem {
  command: QuickWriteMenuCommand;
  label: string;
  disabledReason?: string;
}

export interface QuickWriteMenuGroup {
  id: 'file' | 'edit' | 'format' | 'paragraph';
  label: string;
  items: QuickWriteMenuItem[];
}

export const quickWriteMenuSchema: QuickWriteMenuGroup[] = [
  {
    id: 'file',
    label: 'File',
    items: [
      { command: 'file.open', label: 'Open File' },
      { command: 'file.saveTo', label: 'Save To...' },
      { command: 'file.exportHtml', label: 'Export HTML...' },
      { command: 'file.printToPdf', label: 'Print to PDF...' },
      {
        command: 'file.newWindow',
        label: 'New Window',
        disabledReason: 'Native QuickWrite window runtime is not available yet',
      },
      { command: 'file.close', label: 'Close' },
      {
        command: 'file.exit',
        label: 'Exit',
        disabledReason: 'Native QuickWrite app lifecycle is not available yet',
      },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { command: 'edit.undo', label: 'Undo' },
      { command: 'edit.cut', label: 'Cut' },
      { command: 'edit.copy', label: 'Copy' },
      { command: 'edit.paste', label: 'Paste' },
      { command: 'edit.selectAll', label: 'Select All' },
      { command: 'edit.find', label: 'Find' },
      { command: 'edit.replace', label: 'Replace' },
    ],
  },
  {
    id: 'format',
    label: 'Format',
    items: [
      { command: 'format.bold', label: 'Bold' },
      { command: 'format.italic', label: 'Italic' },
      { command: 'format.link', label: 'Link' },
    ],
  },
  {
    id: 'paragraph',
    label: 'Paragraph',
    items: [
      { command: 'paragraph.body', label: 'Body' },
      { command: 'paragraph.heading', label: 'Heading' },
      { command: 'paragraph.bulletedList', label: 'Bulleted List' },
      { command: 'paragraph.numberedList', label: 'Numbered List' },
      { command: 'paragraph.table', label: 'Table' },
    ],
  },
];
