use tauri::{AppHandle, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::{menu, quick_write_tray};

const QUICK_WRITE_NEW_DRAFT_SHORTCUT: &str = "CommandOrControl+Shift+N";

pub fn register_quick_write_global_shortcut<R: Runtime>(app: &AppHandle<R>) {
    if !menu::is_quick_write_flavor(app) {
        return;
    }

    if let Err(err) = app.plugin(tauri_plugin_global_shortcut::Builder::new().build()) {
        log::error!("QuickWrite global shortcut plugin init failed: {err}");
        return;
    }

    if let Err(err) = app.global_shortcut().on_shortcut(
        QUICK_WRITE_NEW_DRAFT_SHORTCUT,
        |app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            if let Err(err) = quick_write_tray::open_quick_write_new_draft_window(app) {
                log::error!("QuickWrite global shortcut action failed: {err}");
            }
        },
    ) {
        log::error!(
            "QuickWrite global shortcut registration failed for {QUICK_WRITE_NEW_DRAFT_SHORTCUT}: {err}"
        );
    } else {
        log::info!("QuickWrite global shortcut registered for {QUICK_WRITE_NEW_DRAFT_SHORTCUT}");
    }
}
