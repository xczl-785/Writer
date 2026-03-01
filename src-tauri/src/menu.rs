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

fn locale() -> Locale {
    let lang = std::env::var("LANG").unwrap_or_default().to_lowercase();
    if lang.starts_with("zh") {
        Locale::Zh
    } else {
        Locale::En
    }
}

fn tr(zh: &str, en: &str) -> String {
    match locale() {
        Locale::Zh => zh.to_string(),
        Locale::En => en.to_string(),
    }
}

fn item<R: Runtime>(
    app: &AppHandle<R>,
    id: &str,
    zh: &str,
    en: &str,
    accelerator: Option<&str>,
) -> Result<MenuItem<R>, tauri::Error> {
    MenuItem::with_id(app, id, tr(zh, en), true, accelerator)
}

pub fn build_native_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, tauri::Error> {
    let file_menu = Submenu::with_items(
        app,
        &tr("文件", "File"),
        true,
        &[
            &item(app, "menu.file.new", "新建", "New", Some("CmdOrCtrl+N"))?,
            &item(
                app,
                "menu.file.open_folder",
                "打开文件夹",
                "Open Folder",
                Some("CmdOrCtrl+O"),
            )?,
            &item(
                app,
                "menu.file.close_folder",
                "关闭文件夹",
                "Close Folder",
                Some("Shift+CmdOrCtrl+W"),
            )?,
            &item(app, "menu.file.save", "保存", "Save", Some("CmdOrCtrl+S"))?,
            &item(
                app,
                "menu.file.save_as",
                "另存为",
                "Save As",
                Some("Shift+CmdOrCtrl+S"),
            )?,
            &item(app, "menu.file.export_pdf", "导出 PDF", "Export PDF", None)?,
            &item(app, "menu.file.export_html", "导出 HTML", "Export HTML", None)?,
            &item(app, "menu.file.export_image", "导出图片", "Export Image", None)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        &tr("编辑", "Edit"),
        true,
        &[
            &item(app, "menu.edit.undo", "撤销", "Undo", Some("CmdOrCtrl+Z"))?,
            &item(
                app,
                "menu.edit.redo",
                "重做",
                "Redo",
                Some("Shift+CmdOrCtrl+Z"),
            )?,
            &item(app, "menu.edit.cut", "剪切", "Cut", Some("CmdOrCtrl+X"))?,
            &item(app, "menu.edit.copy", "复制", "Copy", Some("CmdOrCtrl+C"))?,
            &item(app, "menu.edit.paste", "粘贴", "Paste", Some("CmdOrCtrl+V"))?,
            &item(
                app,
                "menu.edit.select_all",
                "全选",
                "Select All",
                Some("CmdOrCtrl+A"),
            )?,
            &item(app, "menu.edit.find", "查找", "Find", Some("CmdOrCtrl+F"))?,
            &item(
                app,
                "menu.edit.replace",
                "替换",
                "Replace",
                Some("CmdOrCtrl+H"),
            )?,
        ],
    )?;

    let paragraph_menu = Submenu::with_items(
        app,
        &tr("段落", "Paragraph"),
        true,
        &[
            &item(
                app,
                "menu.paragraph.heading_1",
                "标题 1",
                "Heading 1",
                Some("CmdOrCtrl+1"),
            )?,
            &item(
                app,
                "menu.paragraph.heading_2",
                "标题 2",
                "Heading 2",
                Some("CmdOrCtrl+2"),
            )?,
            &item(
                app,
                "menu.paragraph.heading_3",
                "标题 3",
                "Heading 3",
                Some("CmdOrCtrl+3"),
            )?,
            &item(
                app,
                "menu.paragraph.blockquote",
                "引用",
                "Blockquote",
                Some("Shift+CmdOrCtrl+Q"),
            )?,
            &item(
                app,
                "menu.paragraph.code_block",
                "代码块",
                "Code Block",
                Some("Alt+CmdOrCtrl+C"),
            )?,
            &item(
                app,
                "menu.paragraph.table",
                "表格",
                "Table",
                Some("Alt+CmdOrCtrl+T"),
            )?,
            &item(
                app,
                "menu.paragraph.unordered_list",
                "无序列表",
                "Unordered List",
                Some("Alt+CmdOrCtrl+U"),
            )?,
            &item(
                app,
                "menu.paragraph.ordered_list",
                "有序列表",
                "Ordered List",
                Some("Alt+CmdOrCtrl+O"),
            )?,
        ],
    )?;

    let format_menu = Submenu::with_items(
        app,
        &tr("格式", "Format"),
        true,
        &[
            &item(app, "menu.format.bold", "加粗", "Bold", Some("CmdOrCtrl+B"))?,
            &item(app, "menu.format.italic", "斜体", "Italic", Some("CmdOrCtrl+I"))?,
            &item(
                app,
                "menu.format.inline_code",
                "行内代码",
                "Inline Code",
                Some("CmdOrCtrl+E"),
            )?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        &tr("视图", "View"),
        true,
        &[
            &item(
                app,
                "menu.view.outline",
                "显示大纲",
                "Show Outline",
                Some("Shift+CmdOrCtrl+O"),
            )?,
            &item(
                app,
                "menu.view.toggle_sidebar",
                "切换侧边栏",
                "Toggle Sidebar",
                Some("CmdOrCtrl+\\"),
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
