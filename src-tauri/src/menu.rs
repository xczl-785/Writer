use serde::Serialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager, Runtime};

#[derive(Clone, Copy)]
enum Locale {
    Zh,
    En,
}

#[derive(Clone, Serialize)]
struct MenuCommandEvent {
    id: String,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum AppFlavor {
    Writer,
    QuickWrite,
}

fn app_flavor<R: Runtime>(app: &AppHandle<R>) -> AppFlavor {
    let config = app.config();
    let product_name = config.product_name.as_deref().unwrap_or_default();
    let uses_quick_write_window = config
        .app
        .windows
        .first()
        .map(|window| window.url.to_string() == "quick-write.html")
        .unwrap_or(false);

    if config.identifier == "com.writer.quickwrite"
        || product_name == "Writer QuickWrite"
        || uses_quick_write_window
    {
        AppFlavor::QuickWrite
    } else {
        AppFlavor::Writer
    }
}

pub fn is_quick_write_flavor<R: Runtime>(app: &AppHandle<R>) -> bool {
    app_flavor(app) == AppFlavor::QuickWrite
}

fn locale_from_env() -> Locale {
    let lang = std::env::var("LANG").unwrap_or_default().to_lowercase();
    if lang.starts_with("zh") {
        Locale::Zh
    } else {
        Locale::En
    }
}

fn locale_from_tag(tag: &str) -> Locale {
    let lower = tag.to_lowercase();
    if lower.starts_with("zh") {
        Locale::Zh
    } else {
        Locale::En
    }
}

fn tr(locale: Locale, zh: &str, en: &str) -> String {
    match locale {
        Locale::Zh => zh.to_string(),
        Locale::En => en.to_string(),
    }
}

fn item<R: Runtime>(
    app: &AppHandle<R>,
    locale: Locale,
    id: &str,
    zh: &str,
    en: &str,
    accelerator: Option<&str>,
) -> Result<MenuItem<R>, tauri::Error> {
    item_with_enabled(app, locale, id, zh, en, accelerator, true)
}

fn item_with_enabled<R: Runtime>(
    app: &AppHandle<R>,
    locale: Locale,
    id: &str,
    zh: &str,
    en: &str,
    accelerator: Option<&str>,
    enabled: bool,
) -> Result<MenuItem<R>, tauri::Error> {
    MenuItem::with_id(app, id, tr(locale, zh, en), enabled, accelerator)
}

pub fn build_native_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, tauri::Error> {
    build_native_menu_with_locale(app, locale_from_env())
}

pub fn build_native_menu_for_locale<R: Runtime>(
    app: &AppHandle<R>,
    locale_tag: &str,
) -> Result<Menu<R>, tauri::Error> {
    build_native_menu_with_locale(app, locale_from_tag(locale_tag))
}

fn build_native_menu_with_locale<R: Runtime>(
    app: &AppHandle<R>,
    locale: Locale,
) -> Result<Menu<R>, tauri::Error> {
    match app_flavor(app) {
        AppFlavor::Writer => build_writer_native_menu_with_locale(app, locale),
        AppFlavor::QuickWrite => build_quick_write_native_menu_with_locale(app, locale),
    }
}

fn build_writer_native_menu_with_locale<R: Runtime>(
    app: &AppHandle<R>,
    locale: Locale,
) -> Result<Menu<R>, tauri::Error> {
    let undo_item = PredefinedMenuItem::undo(app, None)?;
    let redo_item = PredefinedMenuItem::redo(app, None)?;
    let cut_item = PredefinedMenuItem::cut(app, None)?;
    let copy_item = PredefinedMenuItem::copy(app, None)?;
    let paste_item = PredefinedMenuItem::paste(app, None)?;
    let select_all_item = PredefinedMenuItem::select_all(app, None)?;

    let file_menu = Submenu::with_items(
        app,
        &tr(locale, "文件", "File"),
        true,
        &[
            &item(
                app,
                locale,
                "menu.file.new",
                "新建文件",
                "New File",
                Some("CmdOrCtrl+N"),
            )?,
            &item(
                app,
                locale,
                "menu.file.new_folder",
                "新建文件夹",
                "New Folder",
                None,
            )?,
            &item(
                app,
                locale,
                "menu.file.open_file",
                "打开文件…",
                "Open File…",
                Some("CmdOrCtrl+O"),
            )?,
            &item(
                app,
                locale,
                "menu.file.open_folder",
                "打开文件夹…",
                "Open Folder…",
                Some("CmdOrCtrl+K CmdOrCtrl+O"),
            )?,
            &item(
                app,
                locale,
                "menu.file.open_workspace",
                "打开工作区…",
                "Open Workspace…",
                Some("CmdOrCtrl+Alt+O"),
            )?,
            &item(
                app,
                locale,
                "menu.file.open_recent",
                "打开最近",
                "Open Recent",
                None,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &item(
                app,
                locale,
                "menu.file.save",
                "保存",
                "Save",
                Some("CmdOrCtrl+S"),
            )?,
            &item(
                app,
                locale,
                "menu.file.add_folder_to_workspace",
                "将文件夹添加到工作区…",
                "Add Folder to Workspace…",
                Some("CmdOrCtrl+Alt+K"),
            )?,
            &item(
                app,
                locale,
                "menu.file.save_workspace",
                "保存工作区",
                "Save Workspace",
                Some("CmdOrCtrl+Alt+S"),
            )?,
            &item(
                app,
                locale,
                "menu.file.save_workspace_as",
                "工作区另存为…",
                "Save Workspace As…",
                Some("CmdOrCtrl+Shift+Alt+S"),
            )?,
            &PredefinedMenuItem::separator(app)?,
            &item_with_enabled(
                app,
                locale,
                "menu.file.export_pdf",
                "导出 PDF",
                "Export PDF",
                None,
                false,
            )?,
            &item_with_enabled(
                app,
                locale,
                "menu.file.export_html",
                "导出 HTML",
                "Export HTML",
                None,
                false,
            )?,
            &item_with_enabled(
                app,
                locale,
                "menu.file.export_image",
                "导出图片",
                "Export Image",
                None,
                false,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &item(
                app,
                locale,
                "menu.file.close_file",
                "关闭文件",
                "Close File",
                Some("CmdOrCtrl+W"),
            )?,
            &item(
                app,
                locale,
                "menu.file.close_folder",
                "关闭文件夹",
                "Close Folder",
                Some("CmdOrCtrl+K F"),
            )?,
            &item(
                app,
                locale,
                "menu.file.close_workspace",
                "关闭工作区",
                "Close Workspace",
                Some("Shift+CmdOrCtrl+W"),
            )?,
            &item(
                app,
                locale,
                "menu.file.settings",
                "设置",
                "Settings",
                Some("CmdOrCtrl+,"),
            )?,
            &item(
                app,
                locale,
                "menu.file.exit",
                "退出",
                "Exit",
                Some("Alt+F4"),
            )?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        &tr(locale, "编辑", "Edit"),
        true,
        &[
            &undo_item,
            &redo_item,
            &cut_item,
            &copy_item,
            &item(
                app,
                locale,
                "menu.edit.copy_markdown",
                "复制为 Markdown",
                "Copy as Markdown",
                Some("CmdOrCtrl+Shift+C"),
            )?,
            &item(
                app,
                locale,
                "menu.edit.copy_plain",
                "复制为纯文本",
                "Copy as Plain Text",
                Some("CmdOrCtrl+Shift+Alt+C"),
            )?,
            &paste_item,
            &item(
                app,
                locale,
                "menu.edit.paste_plain",
                "纯粘贴",
                "Paste as Plain Text",
                Some("CmdOrCtrl+Shift+V"),
            )?,
            &select_all_item,
            &item(
                app,
                locale,
                "menu.edit.find",
                "查找",
                "Find",
                Some("CmdOrCtrl+F"),
            )?,
            &item(
                app,
                locale,
                "menu.edit.replace",
                "替换",
                "Replace",
                Some("CmdOrCtrl+H"),
            )?,
        ],
    )?;

    let paragraph_menu = Submenu::with_items(
        app,
        &tr(locale, "段落", "Paragraph"),
        true,
        &[
            &item(
                app,
                locale,
                "menu.paragraph.heading_1",
                "标题 1",
                "Heading 1",
                Some("CmdOrCtrl+1"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.heading_2",
                "标题 2",
                "Heading 2",
                Some("CmdOrCtrl+2"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.heading_3",
                "标题 3",
                "Heading 3",
                Some("CmdOrCtrl+3"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.heading_4",
                "标题 4",
                "Heading 4",
                Some("CmdOrCtrl+4"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.heading_5",
                "标题 5",
                "Heading 5",
                Some("CmdOrCtrl+5"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.heading_6",
                "标题 6",
                "Heading 6",
                Some("CmdOrCtrl+6"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.blockquote",
                "引用",
                "Blockquote",
                Some("Shift+CmdOrCtrl+Q"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.code_block",
                "代码块",
                "Code Block",
                Some("Alt+CmdOrCtrl+C"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.table",
                "表格",
                "Table",
                Some("Alt+CmdOrCtrl+T"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.unordered_list",
                "无序列表",
                "Unordered List",
                Some("Alt+CmdOrCtrl+U"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.ordered_list",
                "有序列表",
                "Ordered List",
                Some("Alt+CmdOrCtrl+O"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.task_list",
                "任务列表",
                "Task List",
                Some("Alt+CmdOrCtrl+X"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.horizontal_rule",
                "分割线",
                "Horizontal Rule",
                Some("Alt+CmdOrCtrl+H"),
            )?,
            &item(
                app,
                locale,
                "menu.paragraph.math_block",
                "数学公式块",
                "Math Block",
                None,
            )?,
        ],
    )?;

    let format_menu = Submenu::with_items(
        app,
        &tr(locale, "格式", "Format"),
        true,
        &[
            &item(
                app,
                locale,
                "menu.format.bold",
                "加粗",
                "Bold",
                Some("CmdOrCtrl+B"),
            )?,
            &item(
                app,
                locale,
                "menu.format.italic",
                "斜体",
                "Italic",
                Some("CmdOrCtrl+I"),
            )?,
            &item(
                app,
                locale,
                "menu.format.inline_code",
                "行内代码",
                "Inline Code",
                Some("CmdOrCtrl+E"),
            )?,
            &item(
                app,
                locale,
                "menu.format.strike",
                "删除线",
                "Strikethrough",
                Some("Shift+CmdOrCtrl+X"),
            )?,
            &item(
                app,
                locale,
                "menu.format.underline",
                "下划线",
                "Underline",
                Some("CmdOrCtrl+U"),
            )?,
            &item(
                app,
                locale,
                "menu.format.highlight",
                "高亮",
                "Highlight",
                Some("Shift+CmdOrCtrl+H"),
            )?,
            &item(
                app,
                locale,
                "menu.format.link",
                "链接",
                "Link",
                Some("CmdOrCtrl+K"),
            )?,
            &item(
                app,
                locale,
                "menu.format.image",
                "图片",
                "Image",
                Some("Shift+CmdOrCtrl+I"),
            )?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        &tr(locale, "视图", "View"),
        true,
        &[
            &item(
                app,
                locale,
                "menu.view.outline",
                "显示大纲",
                "Show Outline",
                Some("Shift+CmdOrCtrl+O"),
            )?,
            &item(
                app,
                locale,
                "menu.view.toggle_sidebar",
                "切换侧边栏",
                "Toggle Sidebar",
                Some("CmdOrCtrl+\\"),
            )?,
            &item(
                app,
                locale,
                "menu.view.focus_mode",
                "打字机模式",
                "Typewriter Mode",
                Some("F11"),
            )?,
            &item_with_enabled(
                app,
                locale,
                "menu.view.source_mode",
                "源码模式",
                "Source Mode",
                Some("CmdOrCtrl+/"),
                false,
            )?,
        ],
    )?;

    let tools_menu = Submenu::with_items(
        app,
        &tr(locale, "工具", "Tools"),
        true,
        &[&item_with_enabled(
            app,
            locale,
            "menu.tools.command_palette",
            "命令面板",
            "Command Palette",
            None,
            false,
        )?],
    )?;

    let help_menu = Submenu::with_items(
        app,
        &tr(locale, "帮助", "Help"),
        true,
        &[
            &item_with_enabled(
                app,
                locale,
                "menu.help.documentation",
                "使用文档",
                "Documentation",
                None,
                false,
            )?,
            &item_with_enabled(
                app,
                locale,
                "menu.help.release_notes",
                "版本说明",
                "Release Notes",
                None,
                false,
            )?,
            &item_with_enabled(
                app,
                locale,
                "menu.help.about",
                "关于 Writer",
                "About Writer",
                None,
                true,
            )?,
        ],
    )?;

    Menu::with_items(
        app,
        &[
            &file_menu,
            &edit_menu,
            &paragraph_menu,
            &format_menu,
            &view_menu,
            &tools_menu,
            &help_menu,
        ],
    )
}

fn build_quick_write_native_menu_with_locale<R: Runtime>(
    app: &AppHandle<R>,
    locale: Locale,
) -> Result<Menu<R>, tauri::Error> {
    let file_menu = Submenu::with_items(
        app,
        &tr(locale, "文件", "File"),
        true,
        &[
            &item(
                app,
                locale,
                "menu.quick_write.open_file",
                "打开文件…",
                "Open File…",
                Some("CmdOrCtrl+O"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.save_to",
                "保存到…",
                "Save To…",
                Some("CmdOrCtrl+S"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.export_html",
                "导出 HTML…",
                "Export HTML…",
                Some("CmdOrCtrl+Shift+E"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.print_to_pdf",
                "打印为 PDF…",
                "Print to PDF…",
                Some("CmdOrCtrl+P"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.new_window",
                "新建窗口",
                "New Window",
                Some("CmdOrCtrl+N"),
            )?,
            &PredefinedMenuItem::separator(app)?,
            &item(
                app,
                locale,
                "menu.quick_write.close",
                "关闭",
                "Close",
                Some("CmdOrCtrl+W"),
            )?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        &tr(locale, "编辑", "Edit"),
        true,
        &[
            &item(
                app,
                locale,
                "menu.quick_write.edit_undo",
                "撤销",
                "Undo",
                Some("CmdOrCtrl+Z"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.edit_cut",
                "剪切",
                "Cut",
                Some("CmdOrCtrl+X"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.edit_copy",
                "复制",
                "Copy",
                Some("CmdOrCtrl+C"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.edit_paste",
                "粘贴",
                "Paste",
                Some("CmdOrCtrl+V"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.edit_select_all",
                "全选",
                "Select All",
                Some("CmdOrCtrl+A"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.edit_find",
                "查找",
                "Find",
                Some("CmdOrCtrl+F"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.edit_replace",
                "替换",
                "Replace",
                Some("CmdOrCtrl+H"),
            )?,
        ],
    )?;

    let paragraph_menu = Submenu::with_items(
        app,
        &tr(locale, "段落", "Paragraph"),
        true,
        &[
            &item(
                app,
                locale,
                "menu.quick_write.paragraph_body",
                "正文",
                "Body",
                Some("CmdOrCtrl+0"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.paragraph_heading",
                "标题",
                "Heading",
                Some("CmdOrCtrl+1"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.paragraph_bulleted_list",
                "无序列表",
                "Bulleted List",
                Some("Alt+CmdOrCtrl+U"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.paragraph_numbered_list",
                "有序列表",
                "Numbered List",
                Some("Alt+CmdOrCtrl+O"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.paragraph_table",
                "表格",
                "Table",
                Some("Alt+CmdOrCtrl+T"),
            )?,
        ],
    )?;

    let format_menu = Submenu::with_items(
        app,
        &tr(locale, "格式", "Format"),
        true,
        &[
            &item(
                app,
                locale,
                "menu.quick_write.format_bold",
                "加粗",
                "Bold",
                Some("CmdOrCtrl+B"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.format_italic",
                "斜体",
                "Italic",
                Some("CmdOrCtrl+I"),
            )?,
            &item(
                app,
                locale,
                "menu.quick_write.format_link",
                "链接",
                "Link",
                Some("CmdOrCtrl+K"),
            )?,
        ],
    )?;

    Menu::with_items(
        app,
        &[&file_menu, &edit_menu, &paragraph_menu, &format_menu],
    )
}

pub fn emit_menu_command<R: Runtime>(app: &AppHandle<R>, id: &str) {
    if matches!(
        id,
        "undo" | "redo" | "cut" | "copy" | "paste" | "select_all"
    ) {
        return;
    }
    let payload = MenuCommandEvent { id: id.to_string() };
    emit_to_focused_webview_window_or_app(app, "writer://menu-command", payload);
}

pub fn emit_to_focused_webview_window_or_app<R, S>(app: &AppHandle<R>, event: &str, payload: S)
where
    R: Runtime,
    S: Serialize + Clone,
{
    if let Some(window) = app
        .webview_windows()
        .into_values()
        .find(|window| window.is_focused().unwrap_or(false))
    {
        if window.emit(event, payload.clone()).is_ok() {
            return;
        }
    }

    let _ = app.emit(event, payload);
}
