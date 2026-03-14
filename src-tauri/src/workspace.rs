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
// Commands will be migrated from fs.rs in subsequent tasks
