use std::time::{SystemTime, UNIX_EPOCH};

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

use crate::menu;

const QUICK_WRITE_TRAY_ID: &str = "quick-write-tray";
const QUICK_WRITE_MAIN_WINDOW_LABEL: &str = "main";
const QUICK_WRITE_WINDOW_LABEL_PREFIX: &str = "quick-write-";
const QUICK_WRITE_URL: &str = "quick-write.html";
const QUICK_WRITE_NEW_DRAFT_URL: &str = "quick-write.html?newDraft=1";
const QUICK_WRITE_WINDOW_TITLE: &str = "Writer QuickWrite";
const QUICK_WRITE_TRAY_SHOW_ID: &str = "tray.quick_write.show";
const QUICK_WRITE_TRAY_NEW_DRAFT_ID: &str = "tray.quick_write.new_draft";
const QUICK_WRITE_TRAY_EXIT_ID: &str = "tray.quick_write.exit";

pub fn register_quick_write_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), tauri::Error> {
    if !menu::is_quick_write_flavor(app) {
        return Ok(());
    }

    let tray_menu = build_quick_write_tray_menu(app)?;
    let mut builder = TrayIconBuilder::with_id(QUICK_WRITE_TRAY_ID)
        .menu(&tray_menu)
        .tooltip("Writer QuickWrite")
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            handle_quick_write_tray_menu_event(app, event.id().as_ref());
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app).map(|_| ())
}

fn build_quick_write_tray_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, tauri::Error> {
    Menu::with_items(
        app,
        &[
            &MenuItem::with_id(
                app,
                QUICK_WRITE_TRAY_SHOW_ID,
                "显示随手写",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                QUICK_WRITE_TRAY_NEW_DRAFT_ID,
                "新想法",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, QUICK_WRITE_TRAY_EXIT_ID, "退出", true, None::<&str>)?,
        ],
    )
}

fn handle_quick_write_tray_menu_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    match id {
        QUICK_WRITE_TRAY_SHOW_ID => {
            let _ = show_or_open_quick_write_window(app);
        }
        QUICK_WRITE_TRAY_NEW_DRAFT_ID => {
            let _ = open_quick_write_new_draft_window(app);
        }
        QUICK_WRITE_TRAY_EXIT_ID => app.exit(0),
        _ => {}
    }
}

pub fn show_or_open_quick_write_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    if let Some(window) = app
        .get_webview_window(QUICK_WRITE_MAIN_WINDOW_LABEL)
        .or_else(|| {
            app.webview_windows()
                .into_iter()
                .find(|(label, _)| label.starts_with(QUICK_WRITE_WINDOW_LABEL_PREFIX))
                .map(|(_, window)| window)
        })
    {
        window.unminimize().map_err(|err| err.to_string())?;
        window.show().map_err(|err| err.to_string())?;
        window.set_focus().map_err(|err| err.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        QUICK_WRITE_MAIN_WINDOW_LABEL,
        WebviewUrl::App(QUICK_WRITE_URL.into()),
    )
    .title(QUICK_WRITE_WINDOW_TITLE)
    .inner_size(860.0, 620.0)
    .min_inner_size(420.0, 360.0)
    .decorations(false)
    .resizable(true)
    .build()
    .map(|_| ())
    .map_err(|err| err.to_string())
}

pub fn open_quick_write_new_draft_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| err.to_string())?
        .as_millis();
    let label = format!("{QUICK_WRITE_WINDOW_LABEL_PREFIX}{timestamp}");

    WebviewWindowBuilder::new(
        app,
        label,
        WebviewUrl::App(QUICK_WRITE_NEW_DRAFT_URL.into()),
    )
    .title(QUICK_WRITE_WINDOW_TITLE)
    .inner_size(860.0, 620.0)
    .min_inner_size(420.0, 360.0)
    .decorations(false)
    .resizable(true)
    .build()
    .map(|_| ())
    .map_err(|err| err.to_string())
}
