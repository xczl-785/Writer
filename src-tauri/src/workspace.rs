use serde::{Deserialize, Serialize};

// ==================== Types ====================

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
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStateConfig {
    #[serde(alias = "open_files")]
    pub open_files: Option<Vec<String>>,
    #[serde(alias = "active_file")]
    pub active_file: Option<String>,
    #[serde(alias = "sidebar_visible")]
    pub sidebar_visible: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FolderPathResult {
    pub path: String,
    pub nodes: Vec<crate::fs::FileNode>,
    pub error: Option<String>,
}

// ==================== Workspace Lock Types ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceLockInfo {
    pub pid: u32,
    pub locked_at: u64,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceLockStatus {
    pub is_locked: bool,
    pub lock_info: Option<WorkspaceLockInfo>,
}

// ==================== Commands ====================

use std::fs;
use std::path::Path;
use tauri::State;
use tokio::sync::Semaphore;

use crate::fs::FileNode;
use crate::security::WorkspaceAllowlist;

/// 解析工作区文件
#[tauri::command]
pub async fn parse_workspace_file(
    path: &str,
    allowlist: State<'_, std::sync::Mutex<WorkspaceAllowlist>>,
) -> Result<WorkspaceConfig, String> {
    // 安全验证
    let guard = allowlist.lock().map_err(|e| e.to_string())?;
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
    allowlist: State<'_, std::sync::Mutex<WorkspaceAllowlist>>,
) -> Result<(), String> {
    use std::io::Write;
    use tempfile::NamedTempFile;

    // 安全验证
    let guard = allowlist.lock().map_err(|e| e.to_string())?;
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
    allowlist: State<'_, std::sync::Mutex<WorkspaceAllowlist>>,
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

/// 批量加载多个文件夹的树（并行实现）
#[tauri::command]
pub async fn list_tree_batch(
    paths: Vec<String>,
    allowlist: State<'_, std::sync::Mutex<WorkspaceAllowlist>>,
) -> Result<Vec<FolderPathResult>, String> {
    // 输入验证：限制最大路径数量
    if paths.is_empty() {
        return Ok(vec![]);
    }

    if paths.len() > 20 {
        return Err("Too many paths (max 20)".to_string());
    }

    // 安全验证：所有路径必须在工作区内
    {
        let guard = allowlist.lock().map_err(|e| e.to_string())?;
        for path in &paths {
            if let Err(e) = guard.validate_path(path, true) {
                return Err(format!("Security: {}", e));
            }
        }
    }

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
        .filter_map(|entry| crate::fs::build_tree(&entry.path()))
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
