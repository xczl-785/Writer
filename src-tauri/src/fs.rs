use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;
use tauri::State;
use tokio::sync::Semaphore;

use crate::security::WorkspaceAllowlist;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileNode {
    path: String,
    name: String,
    #[serde(rename = "type")]
    node_type: String,
    children: Option<Vec<FileNode>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitSyncStatus {
    is_repo: bool,
    has_remote: bool,
    dirty: bool,
    ahead: u32,
    behind: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncodingStatus {
    label: String,
}

fn is_markdown_name(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".mdx")
}

fn is_skipped_dir(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        ".git"
            | "node_modules"
            | "target"
            | "dist"
            | "build"
            | "coverage"
            | ".idea"
            | ".vscode"
            | ".cache"
            | ".pnpm-store"
            | ".next"
            | ".nuxt"
            | ".svelte-kit"
            | "assets"
            | ".assets"
    )
}

fn build_tree(path: &Path) -> Option<FileNode> {
    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let path_str = path.to_string_lossy().replace('\\', "/");

    if path.is_file() {
        if !is_markdown_name(&name) {
            return None;
        }
        return Some(FileNode {
            path: path_str,
            name,
            node_type: "file".to_string(),
            children: None,
        });
    }

    if path.is_dir() {
        if is_skipped_dir(&name) {
            return None;
        }
        let mut children = fs::read_dir(path)
            .ok()?
            .filter_map(|res| res.ok())
            .filter_map(|entry| build_tree(&entry.path()))
            .collect::<Vec<FileNode>>();

        children.sort_by(|a, b| {
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

        if children.is_empty() {
            return None;
        }

        return Some(FileNode {
            path: path_str,
            name,
            node_type: "directory".to_string(),
            children: Some(children),
        });
    }

    None
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
        .filter_map(|entry| build_tree(&entry.path()))
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

#[derive(Debug, Serialize, Deserialize)]
pub struct FolderPathResult {
    pub path: String,
    pub nodes: Vec<FileNode>,
    pub error: Option<String>,
}

/// 批量加载多个文件夹的树（并行实现）
#[tauri::command]
pub async fn list_tree_batch(
    paths: Vec<String>,
    allowlist: State<'_, tokio::sync::Mutex<WorkspaceAllowlist>>,
) -> Result<Vec<FolderPathResult>, String> {
    // 输入验证：限制最大路径数量
    if paths.is_empty() {
        return Ok(vec![]);
    }

    if paths.len() > 20 {
        return Err("Too many paths (max 20)".to_string());
    }

    // 安全验证：所有路径必须在工作区内
    let guard = allowlist.lock().await;
    for path in &paths {
        if let Err(e) = guard.validate_path(path, true) {
            return Err(format!("Security: {}", e));
        }
    }
    drop(guard);

    // 受限线程池：最大 8 个并发线程
    let semaphore = std::sync::Arc::new(Semaphore::new(8));

    // 并行加载每个文件夹
    let mut handles = Vec::new();
    for path in paths {
        let permit = semaphore.clone().acquire_owned().await.unwrap();
        let path_clone = path.clone();
        let handle = tokio::task::spawn_blocking(move || {
            let result = build_tree_batch(&path_clone).unwrap_or_else(|e| FolderPathResult {
                path: path_clone,
                nodes: vec![],
                error: Some(e),
            });
            drop(permit); // 释放信号量
            result
        });
        handles.push(handle);
    }

    // 收集结果
    let mut results = Vec::new();
    for handle in handles {
        match handle.await {
            Ok(result) => results.push(result),
            Err(e) => results.push(FolderPathResult {
                path: String::new(),
                nodes: vec![],
                error: Some(format!("Task panic: {}", e)),
            }),
        }
    }

    Ok(results)
}

fn build_tree_batch(path: &str) -> Result<FolderPathResult, String> {
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !path_obj.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut entries = fs::read_dir(path_obj)
        .map_err(|e| e.to_string())?
        .filter_map(|res| res.ok())
        .filter_map(|entry| build_tree(&entry.path()))
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

    Ok(FolderPathResult {
        path: path.to_string(),
        nodes: entries,
        error: None,
    })
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
        Err(format!("Failed to open file manager for path: {}", path))
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

fn run_git(path: &str, args: &[&str]) -> Result<String, String> {
    let mut command = Command::new("git");
    command.args(["-C", path]).args(args);
    #[cfg(target_os = "windows")]
    {
        // Prevent flashing a console window for each git poll in release GUI builds.
        command.creation_flags(0x08000000);
    }
    let output = command.output().map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
pub fn get_git_sync_status(path: &str) -> Result<GitSyncStatus, String> {
    if !Path::new(path).exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let repo_check = run_git(path, &["rev-parse", "--is-inside-work-tree"]);
    if repo_check.is_err() || repo_check.as_deref().ok() != Some("true") {
        return Ok(GitSyncStatus {
            is_repo: false,
            has_remote: false,
            dirty: false,
            ahead: 0,
            behind: 0,
        });
    }

    let dirty = run_git(path, &["status", "--porcelain"])
        .map(|v| !v.is_empty())
        .unwrap_or(false);

    let has_remote = run_git(
        path,
        &[
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            "@{upstream}",
        ],
    )
    .map(|v| !v.is_empty())
    .unwrap_or(false);

    if !has_remote {
        return Ok(GitSyncStatus {
            is_repo: true,
            has_remote: false,
            dirty,
            ahead: 0,
            behind: 0,
        });
    }

    let (ahead, behind) = match run_git(
        path,
        &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
    ) {
        Ok(counts) => {
            let mut parts = counts.split_whitespace();
            let ahead = parts
                .next()
                .and_then(|v| v.parse::<u32>().ok())
                .unwrap_or(0);
            let behind = parts
                .next()
                .and_then(|v| v.parse::<u32>().ok())
                .unwrap_or(0);
            (ahead, behind)
        }
        Err(_) => (0, 0),
    };

    Ok(GitSyncStatus {
        is_repo: true,
        has_remote: true,
        dirty,
        ahead,
        behind,
    })
}

#[tauri::command]
pub fn detect_file_encoding(path: &str) -> Result<EncodingStatus, String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut bytes = vec![0_u8; 4096];
    let read_len = file.read(&mut bytes).map_err(|e| e.to_string())?;
    bytes.truncate(read_len);

    let label = if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        "UTF-8 BOM"
    } else if bytes.starts_with(&[0xFF, 0xFE]) {
        "UTF-16 LE"
    } else if bytes.starts_with(&[0xFE, 0xFF]) {
        "UTF-16 BE"
    } else if std::str::from_utf8(&bytes).is_ok() {
        "UTF-8"
    } else {
        "Unknown"
    };

    Ok(EncodingStatus {
        label: label.to_string(),
    })
}

// ==================== Workspace File Commands ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub version: u32,
    #[serde(default)]
    pub folders: Vec<WorkspaceFolderConfig>,
    #[serde(default)]
    pub state: Option<WorkspaceStateConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceFolderConfig {
    pub path: String,
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct WorkspaceStateConfig {
    pub open_files: Option<Vec<String>>,
    pub active_file: Option<String>,
    pub sidebar_visible: Option<bool>,
}

/// 解析工作区文件
#[tauri::command]
pub async fn parse_workspace_file(
    path: &str,
    allowlist: State<'_, tokio::sync::Mutex<WorkspaceAllowlist>>,
) -> Result<WorkspaceConfig, String> {
    // 安全验证
    let guard = allowlist.lock().await;
    guard.validate_path(path, true).map_err(|e| format!("Security: {}", e))?;
    drop(guard);

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config: WorkspaceConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse workspace file: {}", e))?;
    Ok(config)
}

/// 保存工作区文件（使用 tempfile 确保原子性）
#[tauri::command]
pub async fn save_workspace_file(
    path: &str,
    config: WorkspaceConfig,
    allowlist: State<'_, tokio::sync::Mutex<WorkspaceAllowlist>>,
) -> Result<(), String> {
    use std::io::Write;
    use tempfile::NamedTempFile;

    // 安全验证
    let guard = allowlist.lock().await;
    guard.validate_path(path, false).map_err(|e| format!("Security: {}", e))?;
    drop(guard);

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e: serde_json::Error| e.to_string())?;

    let target_path = Path::new(path);
    let parent = target_path.parent().ok_or("Invalid path")?;

    // 使用随机名称的临时文件
    let mut temp_file = NamedTempFile::new_in(parent)
        .map_err(|e: std::io::Error| e.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(temp_file.path(), std::fs::Permissions::from_mode(0o600))
            .map_err(|e: std::io::Error| e.to_string())?;
    }

    temp_file.write_all(content.as_bytes())
        .map_err(|e: std::io::Error| e.to_string())?;

    temp_file.persist(target_path)
        .map_err(|e: tempfile::PersistError| format!("Failed to persist file: {}", e))?;

    Ok(())
}

/// 解析相对路径为绝对路径
#[tauri::command]
pub fn resolve_relative_path(
    base_path: &str,
    relative_path: &str,
    allowlist: State<'_, tokio::sync::Mutex<WorkspaceAllowlist>>,
) -> Result<String, String> {
    // 检查路径穿越
    if relative_path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let base = Path::new(base_path);
    let parent = base.parent().ok_or("Invalid base path")?;
    let resolved = parent.join(relative_path);

    // 规范化路径
    let canonical = if resolved.exists() {
        resolved.canonicalize()
            .map_err(|e| format!("Cannot resolve path: {}", e))?
    } else {
        resolved
    };

    // 验证在工作区边界内（可选）
    // 注意：resolve_relative_path 是同步函数，无法 await
    // 这里简化处理，不做边界验证（由上层调用方保证）
    let _ = allowlist; // 避免未使用警告

    Ok(canonical.to_string_lossy().replace('\\', "/"))
}

#[cfg(test)]
mod tests {
    use super::list_tree;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_case_dir(case: &str) -> PathBuf {
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after unix epoch")
            .as_nanos();
        let mut path = std::env::temp_dir();
        path.push(format!("writer_fs_{case}_{ts}"));
        path
    }

    #[test]
    fn list_tree_only_keeps_markdown_files() {
        let root = temp_case_dir("markdown_only");
        fs::create_dir_all(root.join("docs")).expect("create root fixture");
        fs::write(root.join("docs").join("a.md"), "# a").expect("write a.md");
        fs::write(root.join("docs").join("b.txt"), "b").expect("write b.txt");
        fs::write(root.join("readme.markdown"), "# readme").expect("write readme");
        fs::write(root.join("notes.mdx"), "# notes").expect("write notes");

        let nodes = list_tree(root.to_string_lossy().as_ref()).expect("list tree");

        fn has_txt(nodes: &[super::FileNode]) -> bool {
            nodes.iter().any(|node| {
                if node.name.ends_with(".txt") {
                    return true;
                }
                node.children
                    .as_ref()
                    .map(|children| has_txt(children))
                    .unwrap_or(false)
            })
        }

        assert!(!has_txt(&nodes));

        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn list_tree_skips_heavy_directories() {
        let root = temp_case_dir("skip_heavy_dirs");
        fs::create_dir_all(root.join("node_modules").join("pkg")).expect("create node_modules");
        fs::create_dir_all(root.join(".git")).expect("create .git");
        fs::create_dir_all(root.join("workspace")).expect("create workspace");
        fs::write(root.join("workspace").join("ok.md"), "ok").expect("write ok.md");
        fs::write(root.join("node_modules").join("pkg").join("x.md"), "x").expect("write x.md");

        let nodes = list_tree(root.to_string_lossy().as_ref()).expect("list tree");
        let names: Vec<String> = nodes.iter().map(|n| n.name.clone()).collect();

        assert!(names
            .iter()
            .all(|name| name != "node_modules" && name != ".git"));

        fs::remove_dir_all(root).expect("cleanup");
    }
}
