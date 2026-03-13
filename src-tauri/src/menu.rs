use serde::Serialize;
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::{AppHandle, Emitter, Runtime};

#[derive(Clone, Copy)]
enum Locale {
    Zh,
    En,
}

#[derive(Clone, Serialize)]
struct MenuCommandEvent {
    id: String,
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
    MenuItem::with_id(app, id, tr(locale, zh, en), true, accelerator)
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
    let file_menu = Submenu::with_items(
        app,
        &tr(locale, "文件", "File"),
        true,
        &[
            &item(app, locale, "menu.file.new", "新建", "New", Some("CmdOrCtrl+N"))?,
            &item(
                app,
                locale,
                "menu.file.open_folder",
                "打开文件夹",
                "Open Folder",
                Some("CmdOrCtrl+O"),
            )?,
            &item(
                app,
                locale,
                "menu.file.close_folder",
                "关闭文件夹",
                "Close Folder",
                Some("Shift+CmdOrCtrl+W"),
            )?,
            &item(app, locale, "menu.file.save", "保存", "Save", Some("CmdOrCtrl+S"))?,
            &item(
                app,
                locale,
                "menu.file.save_workspace",
                "保存工作区",
                "Save Workspace",
                None,
            )?,
            &item(
                app,
                locale,
                "menu.file.save_workspace_as",
                "工作区另存为...",
                "Save Workspace As...",
                None,
            )?,
            &item(
                app,
                locale,
                "menu.file.save_as",
                "另存为",
                "Save As",
                Some("Shift+CmdOrCtrl+S"),
            )?,
            &item(app, locale, "menu.file.export_pdf", "导出 PDF", "Export PDF", None)?,
            &item(app, locale, "menu.file.export_html", "导出 HTML", "Export HTML", None)?,
            &item(app, locale, "menu.file.export_image", "导出图片", "Export Image", None)?,
            &item(app, locale, "menu.file.settings", "设置", "Settings", None)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        &tr(locale, "编辑", "Edit"),
        true,
        &[
            &item(app, locale, "menu.edit.undo", "撤销", "Undo", Some("CmdOrCtrl+Z"))?,
            &item(
                app,
                locale,
                "menu.edit.redo",
                "重做",
                "Redo",
                Some("Shift+CmdOrCtrl+Z"),
            )?,
            &item(app, locale, "menu.edit.cut", "剪切", "Cut", Some("CmdOrCtrl+X"))?,
            &item(app, locale, "menu.edit.copy", "复制", "Copy", Some("CmdOrCtrl+C"))?,
            &item(app, locale, "menu.edit.paste", "粘贴", "Paste", Some("CmdOrCtrl+V"))?,
            &item(
                app,
                locale,
                "menu.edit.select_all",
                "全选",
                "Select All",
                Some("CmdOrCtrl+A"),
            )?,
            &item(app, locale, "menu.edit.find", "查找", "Find", Some("CmdOrCtrl+F"))?,
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
            &item(app, locale, "menu.format.bold", "加粗", "Bold", Some("CmdOrCtrl+B"))?,
            &item(app, locale, "menu.format.italic", "斜体", "Italic", Some("CmdOrCtrl+I"))?,
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
            &item(app, locale, "menu.format.link", "链接", "Link", Some("CmdOrCtrl+K"))?,
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
            &item(
                app,
                locale,
                "menu.view.source_mode",
                "源码模式",
                "Source Mode",
                Some("CmdOrCtrl+/"),
            )?,
        ],
    )?;

    Menu::with_items(
        app,
        &[&file_menu, &edit_menu, &paragraph_menu, &format_menu, &view_menu],
    )
}

pub fn emit_menu_command<R: Runtime>(app: &AppHandle<R>, id: &str) {
    let payload = MenuCommandEvent { id: id.to_string() };
    let _ = app.emit("writer://menu-command", payload);
}
