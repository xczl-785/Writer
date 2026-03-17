import type { AppLocale } from '../../shared/i18n/messages';

export type MenuPlatform = 'windows' | 'macos';

type MenuLabels = Record<AppLocale, string>;

export type MenuSchemaItem = {
  id: string;
  labelKey: string;
  fallbackLabels: MenuLabels;
  accelerator?: string;
  enabled?: boolean;
  separator?: boolean;
  children?: MenuSchemaItem[];
};

export type MenuSchemaGroup = {
  id: string;
  labelKey: string;
  fallbackLabels: MenuLabels;
  platforms: MenuPlatform[];
  items: MenuSchemaItem[];
};

export const WINDOWS_MENU_SCHEMA: MenuSchemaGroup[] = [
  {
    id: 'menu.file',
    labelKey: 'menu.file',
    fallbackLabels: { 'zh-CN': '文件', 'en-US': 'File' },
    platforms: ['windows', 'macos'],
    items: [
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
      {
        id: 'menu.file.open_file',
        labelKey: 'menu.file.openFile',
        fallbackLabels: { 'zh-CN': '打开文件…', 'en-US': 'Open File…' },
        accelerator: 'Ctrl+O',
      },
      {
        id: 'menu.file.open_folder',
        labelKey: 'menu.file.openFolder',
        fallbackLabels: { 'zh-CN': '打开文件夹…', 'en-US': 'Open Folder…' },
        accelerator: 'Ctrl+K Ctrl+O',
      },
      {
        id: 'menu.file.open_workspace',
        labelKey: 'menu.file.openWorkspace',
        fallbackLabels: { 'zh-CN': '打开工作区…', 'en-US': 'Open Workspace…' },
        accelerator: 'Ctrl+Alt+O',
      },
      {
        id: 'menu.file.open_recent',
        labelKey: 'recent.menuLabel',
        fallbackLabels: { 'zh-CN': '打开最近', 'en-US': 'Open Recent' },
      },
      { id: 'separator.file.1', labelKey: 'separator.file.1', fallbackLabels: { 'zh-CN': '文件', 'en-US': 'File' }, separator: true },
      {
        id: 'menu.file.add_folder_to_workspace',
        labelKey: 'workspace.addFolderToWorkspace',
        fallbackLabels: { 'zh-CN': '将文件夹添加到工作区…', 'en-US': 'Add Folder to Workspace…' },
        accelerator: 'Ctrl+Alt+K',
      },
      {
        id: 'menu.file.save_workspace',
        labelKey: 'menu.file.saveWorkspace',
        fallbackLabels: { 'zh-CN': '保存工作区', 'en-US': 'Save Workspace' },
        accelerator: 'Ctrl+Alt+S',
      },
      {
        id: 'menu.file.save_workspace_as',
        labelKey: 'menu.file.saveWorkspaceAs',
        fallbackLabels: { 'zh-CN': '工作区另存为…', 'en-US': 'Save Workspace As…' },
        accelerator: 'Ctrl+Shift+Alt+S',
      },
      { id: 'separator.file.2', labelKey: 'separator.file.2', fallbackLabels: { 'zh-CN': '工作区', 'en-US': 'Workspace' }, separator: true },
      { id: 'separator.file.3', labelKey: 'separator.file.3', fallbackLabels: { 'zh-CN': '', 'en-US': '' }, separator: true },
      {
        id: 'menu.file.export',
        labelKey: 'menu.file.export',
        fallbackLabels: { 'zh-CN': '导出…', 'en-US': 'Export…' },
        children: [
          {
            id: 'menu.file.export_pdf',
            labelKey: 'menu.file.exportPdf',
            fallbackLabels: { 'zh-CN': '导出 PDF', 'en-US': 'Export PDF' },
            enabled: false,
            accelerator: '即将支持',
          },
          {
            id: 'menu.file.export_html',
            labelKey: 'menu.file.exportHtml',
            fallbackLabels: { 'zh-CN': '导出 HTML', 'en-US': 'Export HTML' },
            enabled: false,
            accelerator: '即将支持',
          },
          {
            id: 'menu.file.export_image',
            labelKey: 'menu.file.exportImage',
            fallbackLabels: { 'zh-CN': '导出图片', 'en-US': 'Export Image' },
            enabled: false,
            accelerator: '即将支持',
          },
        ],
      },
      { id: 'separator.file.4', labelKey: 'separator.file.4', fallbackLabels: { 'zh-CN': '关闭', 'en-US': 'Close' }, separator: true },
      {
        id: 'menu.file.close_file',
        labelKey: 'menu.file.closeFile',
        fallbackLabels: { 'zh-CN': '关闭文件', 'en-US': 'Close File' },
        accelerator: 'Ctrl+W',
      },
      {
        id: 'menu.file.close_folder',
        labelKey: 'menu.file.closeFolder',
        fallbackLabels: { 'zh-CN': '关闭文件夹', 'en-US': 'Close Folder' },
        accelerator: 'Ctrl+K F',
      },
      {
        id: 'menu.file.close_workspace',
        labelKey: 'menu.file.closeWorkspace',
        fallbackLabels: { 'zh-CN': '关闭工作区', 'en-US': 'Close Workspace' },
        accelerator: 'Shift+Ctrl+W',
      },
      { id: 'separator.file.5', labelKey: 'separator.file.5', fallbackLabels: { 'zh-CN': '', 'en-US': '' }, separator: true },
      {
        id: 'menu.file.settings',
        labelKey: 'menu.file.settings',
        fallbackLabels: { 'zh-CN': '设置', 'en-US': 'Settings' },
        accelerator: 'Ctrl+,',
      },
      {
        id: 'menu.file.exit',
        labelKey: 'menu.file.exit',
        fallbackLabels: { 'zh-CN': '退出', 'en-US': 'Exit' },
        accelerator: 'Alt+F4',
      },
    ],
  },
  {
    id: 'menu.edit',
    labelKey: 'menu.edit',
    fallbackLabels: { 'zh-CN': '编辑', 'en-US': 'Edit' },
    platforms: ['windows', 'macos'],
    items: [
      { id: 'menu.edit.undo', labelKey: 'menu.edit.undo', fallbackLabels: { 'zh-CN': '撤销', 'en-US': 'Undo' }, accelerator: 'Ctrl+Z' },
      { id: 'menu.edit.redo', labelKey: 'menu.edit.redo', fallbackLabels: { 'zh-CN': '重做', 'en-US': 'Redo' }, accelerator: 'Ctrl+Y' },
      { id: 'separator.edit.1', labelKey: 'separator.edit.1', fallbackLabels: { 'zh-CN': '', 'en-US': '' }, separator: true },
      { id: 'menu.edit.cut', labelKey: 'menu.edit.cut', fallbackLabels: { 'zh-CN': '剪切', 'en-US': 'Cut' }, accelerator: 'Ctrl+X' },
      { id: 'menu.edit.copy', labelKey: 'menu.edit.copy', fallbackLabels: { 'zh-CN': '复制', 'en-US': 'Copy' }, accelerator: 'Ctrl+C' },
      { id: 'menu.edit.paste', labelKey: 'menu.edit.paste', fallbackLabels: { 'zh-CN': '粘贴', 'en-US': 'Paste' }, accelerator: 'Ctrl+V' },
      { id: 'menu.edit.select_all', labelKey: 'menu.edit.selectAll', fallbackLabels: { 'zh-CN': '全选', 'en-US': 'Select All' }, accelerator: 'Ctrl+A' },
      { id: 'separator.edit.2', labelKey: 'separator.edit.2', fallbackLabels: { 'zh-CN': '', 'en-US': '' }, separator: true },
      { id: 'menu.edit.find', labelKey: 'menu.edit.find', fallbackLabels: { 'zh-CN': '查找', 'en-US': 'Find' }, accelerator: 'Ctrl+F' },
      { id: 'menu.edit.replace', labelKey: 'menu.edit.replace', fallbackLabels: { 'zh-CN': '替换', 'en-US': 'Replace' }, accelerator: 'Ctrl+H' },
    ],
  },
  {
    id: 'menu.paragraph',
    labelKey: 'menu.paragraph',
    fallbackLabels: { 'zh-CN': '段落', 'en-US': 'Paragraph' },
    platforms: ['windows', 'macos'],
    items: [
      { id: 'menu.paragraph.heading_1', labelKey: 'menu.paragraph.heading1', fallbackLabels: { 'zh-CN': '标题 1', 'en-US': 'Heading 1' }, accelerator: 'Ctrl+1' },
      { id: 'menu.paragraph.heading_2', labelKey: 'menu.paragraph.heading2', fallbackLabels: { 'zh-CN': '标题 2', 'en-US': 'Heading 2' }, accelerator: 'Ctrl+2' },
      { id: 'menu.paragraph.heading_3', labelKey: 'menu.paragraph.heading3', fallbackLabels: { 'zh-CN': '标题 3', 'en-US': 'Heading 3' }, accelerator: 'Ctrl+3' },
      { id: 'separator.paragraph.1', labelKey: 'separator.paragraph.1', fallbackLabels: { 'zh-CN': '', 'en-US': '' }, separator: true },
      { id: 'menu.paragraph.blockquote', labelKey: 'menu.paragraph.blockquote', fallbackLabels: { 'zh-CN': '引用', 'en-US': 'Blockquote' } },
      { id: 'menu.paragraph.code_block', labelKey: 'menu.paragraph.codeBlock', fallbackLabels: { 'zh-CN': '代码块', 'en-US': 'Code Block' } },
      { id: 'menu.paragraph.table', labelKey: 'menu.paragraph.table', fallbackLabels: { 'zh-CN': '表格', 'en-US': 'Table' } },
      { id: 'menu.paragraph.unordered_list', labelKey: 'menu.paragraph.unorderedList', fallbackLabels: { 'zh-CN': '无序列表', 'en-US': 'Unordered List' } },
      { id: 'menu.paragraph.ordered_list', labelKey: 'menu.paragraph.orderedList', fallbackLabels: { 'zh-CN': '有序列表', 'en-US': 'Ordered List' } },
      { id: 'menu.paragraph.task_list', labelKey: 'menu.paragraph.taskList', fallbackLabels: { 'zh-CN': '任务列表', 'en-US': 'Task List' } },
      { id: 'menu.paragraph.horizontal_rule', labelKey: 'menu.paragraph.horizontalRule', fallbackLabels: { 'zh-CN': '分割线', 'en-US': 'Horizontal Rule' } },
      { id: 'menu.paragraph.math_block', labelKey: 'menu.paragraph.mathBlock', fallbackLabels: { 'zh-CN': '数学公式块', 'en-US': 'Math Block' }, enabled: false },
    ],
  },
  {
    id: 'menu.format',
    labelKey: 'menu.format',
    fallbackLabels: { 'zh-CN': '格式', 'en-US': 'Format' },
    platforms: ['windows', 'macos'],
    items: [
      { id: 'menu.format.bold', labelKey: 'menu.format.bold', fallbackLabels: { 'zh-CN': '加粗', 'en-US': 'Bold' }, accelerator: 'Ctrl+B' },
      { id: 'menu.format.italic', labelKey: 'menu.format.italic', fallbackLabels: { 'zh-CN': '斜体', 'en-US': 'Italic' }, accelerator: 'Ctrl+I' },
      { id: 'menu.format.inline_code', labelKey: 'menu.format.inlineCode', fallbackLabels: { 'zh-CN': '行内代码', 'en-US': 'Inline Code' }, accelerator: 'Ctrl+E' },
      { id: 'menu.format.strike', labelKey: 'menu.format.strike', fallbackLabels: { 'zh-CN': '删除线', 'en-US': 'Strikethrough' }, accelerator: 'Shift+Ctrl+X' },
      { id: 'separator.format.1', labelKey: 'separator.format.1', fallbackLabels: { 'zh-CN': '', 'en-US': '' }, separator: true },
      { id: 'menu.format.underline', labelKey: 'menu.format.underline', fallbackLabels: { 'zh-CN': '下划线', 'en-US': 'Underline' }, accelerator: 'Ctrl+U' },
      { id: 'menu.format.highlight', labelKey: 'menu.format.highlight', fallbackLabels: { 'zh-CN': '高亮', 'en-US': 'Highlight' }, accelerator: 'Shift+Ctrl+H' },
      { id: 'menu.format.link', labelKey: 'menu.format.link', fallbackLabels: { 'zh-CN': '链接', 'en-US': 'Link' }, accelerator: 'Ctrl+K' },
      { id: 'menu.format.image', labelKey: 'menu.format.image', fallbackLabels: { 'zh-CN': '图片', 'en-US': 'Image' }, accelerator: 'Shift+Ctrl+I' },
    ],
  },
  {
    id: 'menu.view',
    labelKey: 'menu.view',
    fallbackLabels: { 'zh-CN': '视图', 'en-US': 'View' },
    platforms: ['windows', 'macos'],
    items: [
      { id: 'menu.view.outline', labelKey: 'menu.view.outline', fallbackLabels: { 'zh-CN': '显示大纲', 'en-US': 'Show Outline' } },
      { id: 'menu.view.toggle_sidebar', labelKey: 'menu.view.toggleSidebar', fallbackLabels: { 'zh-CN': '切换侧边栏', 'en-US': 'Toggle Sidebar' }, accelerator: 'Ctrl+\\' },
      { id: 'menu.view.focus_mode', labelKey: 'menu.view.focusMode', fallbackLabels: { 'zh-CN': '打字机模式', 'en-US': 'Typewriter Mode' }, accelerator: 'F11' },
      { id: 'menu.view.source_mode', labelKey: 'menu.view.sourceMode', fallbackLabels: { 'zh-CN': '源码模式', 'en-US': 'Source Mode' }, enabled: false },
    ],
  },
  {
    id: 'menu.tools',
    labelKey: 'menu.tools',
    fallbackLabels: { 'zh-CN': '工具', 'en-US': 'Tools' },
    platforms: ['windows'],
    items: [
      { id: 'menu.tools.command_palette', labelKey: 'menu.tools.commandPalette', fallbackLabels: { 'zh-CN': '命令面板', 'en-US': 'Command Palette' }, enabled: false },
    ],
  },
  {
    id: 'menu.help',
    labelKey: 'menu.help',
    fallbackLabels: { 'zh-CN': '帮助', 'en-US': 'Help' },
    platforms: ['windows'],
    items: [
      { id: 'menu.help.documentation', labelKey: 'menu.help.documentation', fallbackLabels: { 'zh-CN': '使用文档', 'en-US': 'Documentation' }, enabled: false },
      { id: 'menu.help.release_notes', labelKey: 'menu.help.releaseNotes', fallbackLabels: { 'zh-CN': '版本说明', 'en-US': 'Release Notes' }, enabled: false },
      { id: 'separator.help.1', labelKey: 'separator.help.1', fallbackLabels: { 'zh-CN': '', 'en-US': '' }, separator: true },
      { id: 'menu.help.about', labelKey: 'menu.help.about', fallbackLabels: { 'zh-CN': '关于 Writer', 'en-US': 'About Writer' }, enabled: false },
    ],
  },
];
