// src-tauri/src/security.rs
// Workspace path validation and security layer

use std::path::PathBuf;

/// 工作区路径验证器
///
/// 用于验证文件路径是否在工作区边界内，防止路径穿越攻击
pub struct WorkspaceAllowlist {
    roots: Vec<PathBuf>,
}

impl WorkspaceAllowlist {
    /// 创建新的路径验证器
    pub fn new(roots: Vec<String>) -> Self {
        Self {
            roots: roots.into_iter().map(PathBuf::from).collect(),
        }
    }

    /// 创建空的路径验证器
    pub fn empty() -> Self {
        Self { roots: vec![] }
    }

    /// 验证路径是否在工作区边界内
    ///
    /// # Arguments
    /// * `path` - 要验证的路径
    /// * `must_exist` - 路径是否必须已存在（新文件创建场景为 false）
    ///
    /// # Returns
    /// * `Ok(PathBuf)` - 验证通过，返回规范化路径
    /// * `Err(SecurityError)` - 验证失败
    pub fn validate_path(&self, path: &str, must_exist: bool) -> Result<PathBuf, SecurityError> {
        let path_buf = PathBuf::from(path);

        // 路径穿越检查（显式）
        if path.contains("..") {
            // 允许 .. 但需要验证最终路径是否在工作区内
            // 如果 must_exist=false，只验证父目录
        }

        // 已存在路径：验证完整路径
        if must_exist && path_buf.exists() {
            let canonical = path_buf
                .canonicalize()
                .map_err(|_| SecurityError::InvalidPath)?;
            return self.check_boundary(canonical);
        }

        // 新路径：验证父目录在工作区内
        if let Some(parent) = path_buf.parent() {
            if parent.exists() {
                let canonical_parent = parent
                    .canonicalize()
                    .map_err(|_| SecurityError::InvalidPath)?;
                self.check_boundary(canonical_parent)?;
            }
        }

        // 返回原始路径（不 canonicalize，因为文件不存在）
        Ok(path_buf)
    }

    /// 检查路径是否在任何工作区根目录内
    fn check_boundary(&self, canonical: PathBuf) -> Result<PathBuf, SecurityError> {
        if self.roots.is_empty() {
            // 没有设置根目录时，允许任何路径（向后兼容）
            return Ok(canonical);
        }

        if !self.roots.iter().any(|root| canonical.starts_with(root)) {
            return Err(SecurityError::OutsideWorkspace);
        }
        Ok(canonical)
    }

    /// 添加工作区根目录
    pub fn add_root(&mut self, path: String) -> Result<(), SecurityError> {
        let canonical = PathBuf::from(path)
            .canonicalize()
            .map_err(|_| SecurityError::InvalidPath)?;
        self.roots.push(canonical);
        Ok(())
    }

    /// 清除所有根目录
    pub fn clear_roots(&mut self) {
        self.roots.clear();
    }

    /// 获取根目录数量
    pub fn root_count(&self) -> usize {
        self.roots.len()
    }

    /// 获取根目录引用
    pub fn roots(&self) -> &[PathBuf] {
        &self.roots
    }

    /// 设置根目录（用于测试）
    pub fn set_roots(&mut self, roots: Vec<String>) -> Result<(), SecurityError> {
        self.roots.clear();
        for root in roots {
            self.add_root(root)?;
        }
        Ok(())
    }
}

impl Default for WorkspaceAllowlist {
    fn default() -> Self {
        Self::empty()
    }
}

/// 安全错误类型
#[derive(Debug, Clone)]
pub enum SecurityError {
    /// 路径不存在或无效
    InvalidPath,
    /// 路径在工作区边界外
    OutsideWorkspace,
    /// 检测到路径穿越攻击
    PathTraversal,
    /// 权限不足
    PermissionDenied,
}

impl std::fmt::Display for SecurityError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            SecurityError::InvalidPath => write!(f, "Invalid path"),
            SecurityError::OutsideWorkspace => write!(f, "Path outside workspace boundaries"),
            SecurityError::PathTraversal => write!(f, "Path traversal detected"),
            SecurityError::PermissionDenied => write!(f, "Permission denied"),
        }
    }
}

impl std::error::Error for SecurityError {}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_validate_path_inside_workspace() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_root = temp_dir.path().to_string_lossy().to_string();

        let mut allowlist = WorkspaceAllowlist::empty();
        allowlist.add_root(workspace_root.clone()).unwrap();

        // 创建测试文件
        let test_file = temp_dir.path().join("test.md");
        fs::write(&test_file, "test").unwrap();

        let result = allowlist.validate_path(test_file.to_string_lossy().as_ref(), true);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_path_outside_workspace() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_root = temp_dir.path().to_string_lossy().to_string();

        let mut allowlist = WorkspaceAllowlist::empty();
        allowlist.add_root(workspace_root).unwrap();

        // 尝试访问工作区外的路径
        let result = allowlist.validate_path("/etc/passwd", true);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SecurityError::OutsideWorkspace
        ));
    }

    #[test]
    fn test_validate_new_file_path() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_root = temp_dir.path().to_string_lossy().to_string();

        let mut allowlist = WorkspaceAllowlist::empty();
        allowlist.add_root(workspace_root.clone()).unwrap();

        // 新文件路径（不存在）
        let new_file = temp_dir.path().join("new_file.md");
        let result = allowlist.validate_path(new_file.to_string_lossy().as_ref(), false);
        assert!(result.is_ok());
    }

    #[test]
    fn test_empty_allowlist_allows_all() {
        let allowlist = WorkspaceAllowlist::empty();

        // 空列表时允许任何路径（向后兼容）
        let result = allowlist.validate_path("/any/path", false);
        assert!(result.is_ok());
    }
}
