pub mod fs;
pub mod menu;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());

    builder = builder.on_menu_event(|app, event| {
        menu::emit_menu_command(app, event.id().as_ref());
    });

    builder
        .invoke_handler(tauri::generate_handler![
            greet,
            fs::list_tree,
            fs::read_file,
            fs::write_file_atomic,
            fs::create_file,
            fs::create_dir,
            fs::rename_node,
            fs::delete_node,
            fs::reveal_in_file_manager,
            fs::save_image,
            fs::check_exists,
            fs::get_git_sync_status,
            fs::detect_file_encoding
        ])
        .setup(|app| {
            let native_menu = menu::build_native_menu(&app.handle())?;
            app.set_menu(native_menu)?;
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
