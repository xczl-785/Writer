use std::fs;
use std::io::Write;
use std::path::Path;
use tauri::Manager;
use tempfile::NamedTempFile;

// ==================== App Config Directory ====================

/// Get the application config directory path
#[tauri::command]
pub fn get_app_config_dir(app: tauri::AppHandle) -> Result<String, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    // Ensure the directory exists
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config dir: {}", e))?;
    }

    Ok(config_dir.to_string_lossy().replace('\\', "/"))
}

/// Read a JSON file from the given path
#[tauri::command]
pub fn read_json_file(path: &str) -> Result<serde_json::Value, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let json: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;
    Ok(json)
}

/// Write a JSON file to the given path (atomic write)
#[tauri::command]
pub fn write_json_file(path: &str, data: serde_json::Value) -> Result<(), String> {
    let content =
        serde_json::to_string_pretty(&data).map_err(|e: serde_json::Error| e.to_string())?;

    let path_obj = Path::new(path);
    let parent = path_obj.parent().ok_or("Invalid path")?;

    // Ensure parent directory exists
    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Use atomic write
    let mut temp_file = NamedTempFile::new_in(parent).map_err(|e: std::io::Error| e.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(temp_file.path(), std::fs::Permissions::from_mode(0o600))
            .map_err(|e: std::io::Error| e.to_string())?;
    }

    temp_file
        .write_all(content.as_bytes())
        .map_err(|e: std::io::Error| e.to_string())?;

    temp_file
        .persist(path_obj)
        .map_err(|e: tempfile::PersistError| format!("Failed to persist file: {}", e))?;

    Ok(())
}
