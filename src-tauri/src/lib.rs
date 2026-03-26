pub mod cli;
pub mod config;
pub mod fs;
pub mod menu;
pub mod security;
pub mod watcher;
pub mod workspace;

use cli::FileOpenState;
use security::WorkspaceAllowlist;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, RunEvent};
use watcher::WatcherState;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_menu_locale(app: AppHandle, locale: String) -> Result<(), String> {
    let native_menu =
        menu::build_native_menu_for_locale(&app, &locale).map_err(|err| err.to_string())?;
    app.set_menu(native_menu)
        .map(|_| ())
        .map_err(|err| err.to_string())
}

#[tauri::command]
fn get_startup_file_path(state: tauri::State<'_, cli::StartupArgs>) -> Option<String> {
    state.file_path.clone()
}

#[tauri::command]
fn get_pending_file_path(state: tauri::State<'_, FileOpenState>) -> Option<String> {
    state.get_and_clear_pending_file()
}

const FILE_OPEN_EVENT: &str = "writer:file-open";

fn emit_file_open_event(app: &AppHandle, file_path: String) {
    let _ = app.emit(FILE_OPEN_EVENT, file_path);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_args = cli::StartupArgs::from_args();
    let file_open_state = FileOpenState::new();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(WorkspaceAllowlist::default()))
        .manage(Mutex::new(WatcherState::default()))
        .manage(startup_args)
        .manage(file_open_state);

    builder = builder.on_menu_event(|app, event| {
        menu::emit_menu_command(app, event.id().as_ref());
    });

    builder
        .invoke_handler(tauri::generate_handler![
            greet,
            set_menu_locale,
            get_startup_file_path,
            get_pending_file_path,
            fs::list_tree,
            workspace::list_tree_batch,
            fs::read_file,
            fs::write_file_atomic,
            fs::create_file,
            fs::create_dir,
            fs::rename_node,
            fs::delete_node,
            fs::reveal_in_file_manager,
            fs::save_image,
            fs::check_exists,
            fs::get_path_kind,
            fs::detect_file_encoding,
            fs::copy_file_with_result,
            workspace::parse_workspace_file,
            workspace::save_workspace_file,
            workspace::resolve_relative_path,
            config::get_app_config_dir,
            config::read_json_file,
            config::write_json_file,
            workspace::check_workspace_lock,
            workspace::acquire_workspace_lock,
            workspace::release_workspace_lock,
            workspace::force_release_workspace_lock,
            watcher::start_watching,
            watcher::stop_watching,
            watcher::update_watch_paths,
            watcher::get_watcher_status,
        ])
        .setup(|app| {
            let native_menu = menu::build_native_menu(&app.handle())?;
            app.set_menu(native_menu)?;
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            if let RunEvent::Opened { urls } = event {
                let files = cli::parse_urls_to_files(urls);
                if let Some(file_path) = files.into_iter().next() {
                    let file_open_state = app.state::<FileOpenState>();
                    file_open_state.set_pending_file(file_path.clone());
                    emit_file_open_event(&app, file_path);
                }
            }
        });
}
