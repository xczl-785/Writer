use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileNode {
    path: String,
    name: String,
    #[serde(rename = "type")]
    node_type: String,
    children: Option<Vec<FileNode>>,
}

#[tauri::command]
pub fn list_tree(path: &str) -> Result<Vec<FileNode>, String> {
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !path_obj.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut entries = fs::read_dir(path)
        .map_err(|e| e.to_string())?
        .filter_map(|res| res.ok())
        .map(|entry| {
            let path = entry.path();
            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let path_str = path.to_string_lossy().to_string();
            let is_dir = path.is_dir();
            let node_type = if is_dir {
                "directory".to_string()
            } else {
                "file".to_string()
            };

            let children = if is_dir {
                list_tree(&path_str).ok()
            } else {
                None
            };

            FileNode {
                path: path_str,
                name,
                node_type,
                children,
            }
        })
        .collect::<Vec<FileNode>>();

    entries.sort_by(|a, b| {
        let a_is_dir = a.node_type == "directory";
        let b_is_dir = b.node_type == "directory";

        if a_is_dir && !b_is_dir {
            std::cmp::Ordering::Less
        } else if !a_is_dir && b_is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.cmp(&b.name)
        }
    });

    Ok(entries)
}

#[tauri::command]
pub fn read_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file_atomic(path: &str, content: &str) -> Result<(), String> {
    let path_obj = Path::new(path);
    let parent = path_obj.parent().ok_or("Invalid path")?;

    if !parent.exists() {
        return Err(format!(
            "Parent directory does not exist: {}",
            parent.to_string_lossy()
        ));
    }

    let temp_file_path = parent.join(format!(
        ".{}.tmp",
        path_obj.file_name().unwrap_or_default().to_string_lossy()
    ));

    match fs::write(&temp_file_path, content) {
        Ok(_) => {}
        Err(e) => return Err(e.to_string()),
    }

    match fs::rename(&temp_file_path, path) {
        Ok(_) => Ok(()),
        Err(e) => {
            let _ = fs::remove_file(&temp_file_path);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn create_file(path: &str) -> Result<(), String> {
    let path_obj = Path::new(path);
    if path_obj.exists() {
        return Err(format!("File already exists: {}", path));
    }

    let parent = path_obj.parent().ok_or("Invalid path")?;
    if !parent.exists() {
        return Err(format!(
            "Parent directory does not exist: {}",
            parent.to_string_lossy()
        ));
    }

    fs::File::create(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_dir(path: &str) -> Result<(), String> {
    let path_obj = Path::new(path);
    if path_obj.exists() {
        return Err(format!("Directory already exists: {}", path));
    }

    let parent = path_obj.parent().ok_or("Invalid path")?;
    if !parent.exists() {
        return Err(format!(
            "Parent directory does not exist: {}",
            parent.to_string_lossy()
        ));
    }

    fs::create_dir(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn rename_node(old_path: &str, new_path: &str) -> Result<(), String> {
    let old_path_obj = Path::new(old_path);
    if !old_path_obj.exists() {
        return Err(format!("Source path does not exist: {}", old_path));
    }

    let new_path_obj = Path::new(new_path);
    if new_path_obj.exists() {
        return Err(format!("Destination path already exists: {}", new_path));
    }

    fs::rename(old_path, new_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_node(path: &str) -> Result<(), String> {
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if path_obj.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())?;
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn reveal_in_file_manager(path: &str) -> Result<(), String> {
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    #[cfg(target_os = "macos")]
    let status = Command::new("open")
        .arg("-R")
        .arg(path)
        .status()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    let status = Command::new("explorer")
        .arg(format!("/select,{}", path.replace('/', "\\")))
        .status()
        .map_err(|e| e.to_string())?;

    #[cfg(all(unix, not(target_os = "macos")))]
    let status = {
        let target = if path_obj.is_dir() {
            path_obj
        } else {
            path_obj.parent().ok_or("Invalid path")?
        };
        Command::new("xdg-open")
            .arg(target)
            .status()
            .map_err(|e| e.to_string())?
    };

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "Failed to open file manager for path: {}",
            path
        ))
    }
}

#[tauri::command]
pub fn save_image(path: &str, data: Vec<u8>) -> Result<(), String> {
    let path_obj = Path::new(path);
    let parent = path_obj.parent().ok_or("Invalid path")?;

    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let temp_file_path = parent.join(format!(
        ".{}.tmp",
        path_obj.file_name().unwrap_or_default().to_string_lossy()
    ));

    match fs::write(&temp_file_path, &data) {
        Ok(_) => {}
        Err(e) => return Err(e.to_string()),
    }

    match fs::rename(&temp_file_path, path) {
        Ok(_) => Ok(()),
        Err(e) => {
            let _ = fs::remove_file(&temp_file_path);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn check_exists(path: &str) -> Result<bool, String> {
    Ok(Path::new(path).exists())
}
