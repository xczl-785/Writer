use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileNode {
    pub path: String,
    pub name: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub children: Option<Vec<FileNode>>,
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

pub fn build_tree(path: &Path) -> Option<FileNode> {
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

#[tauri::command]
pub fn get_path_kind(path: &str) -> Result<String, String> {
    let path_obj = Path::new(path);

    if !path_obj.exists() {
        return Ok("missing".to_string());
    }

    if path_obj.is_dir() {
        return Ok("directory".to_string());
    }

    if path_obj.is_file() {
        return Ok("file".to_string());
    }

    Ok("other".to_string())
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

// ========== V6.1 单文件拖拽 - 文件复制命令 ==========

/// 复制结果
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CopyResult {
    /// 实际写入的文件路径（处理自动重命名）
    pub actual_path: String,
    /// 复制的字节数
    pub bytes_written: u64,
}

/// 复制文件（返回实际写入路径）
///
/// 支持自动重命名、隐藏文件和无扩展名文件
#[tauri::command]
pub async fn copy_file_with_result(
    source: String,
    target: String,
) -> Result<CopyResult, String> {
    // 1. 规范化源路径（使用 canonicalize 解析符号链接和相对路径）
    let source_path = normalize_source_path(&source)
        .ok_or_else(|| format!("Invalid source path: {}", source))?;

    // 2. 规范化目标路径（仅规范化父目录，保留原始文件名）
    let target_path = normalize_target_path(&target)
        .ok_or_else(|| format!("Invalid target path: {}", target))?;

    // 3. 校验源文件存在
    if !Path::new(&source_path).exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    // 4. 检查目标目录存在
    let target_dir = Path::new(&target_path)
        .parent()
        .ok_or_else(|| "Invalid target path: no parent directory".to_string())?;

    if !target_dir.exists() {
        return Err("Target directory does not exist".to_string());
    }

    // 5. 检查目标文件是否存在，若存在则自动重命名
    let final_path = if Path::new(&target_path).exists() {
        generate_unique_path(&target_path)
            .ok_or_else(|| "Failed to generate unique path".to_string())?
    } else {
        target_path.clone()
    };

    // 6. 执行复制（保持元数据）
    let bytes_written = std::fs::copy(&source_path, &final_path)
        .map_err(|e| format!("Copy failed: {}", e))?;

    Ok(CopyResult {
        actual_path: final_path,
        bytes_written,
    })
}

/// 规范化源文件路径（使用 canonicalize 解析完整路径）
///
/// 源文件必须存在，因此可以安全使用 canonicalize
fn normalize_source_path(path: &str) -> Option<String> {
    let path = Path::new(path);
    path.canonicalize()
        .ok()
        .map(|p| p.to_string_lossy().replace('\\', "/"))
}

/// 规范化目标路径（仅规范化父目录，保留原始文件名）
///
/// 目标文件可能不存在，因此不能对完整路径使用 canonicalize
/// 而是规范化父目录后拼接文件名
fn normalize_target_path(path: &str) -> Option<String> {
    let path = Path::new(path);

    // 获取父目录和文件名
    let parent = path.parent()?;
    let file_name = path.file_name()?; // 包含扩展名的完整文件名

    // 规范化父目录（父目录必须存在）
    let canonical_parent = parent.canonicalize().ok()?;

    // 拼接规范化后的路径
    let normalized = canonical_parent.join(file_name);
    Some(normalized.to_string_lossy().replace('\\', "/"))
}

/// 生成唯一路径（若文件已存在）
///
/// 使用 Path API 进行跨平台路径操作，避免字符串拼接的跨平台问题
///
/// 支持以下特殊情况：
/// - 隐藏文件（如 `.gitignore`）：file_stem 为空时使用完整文件名
/// - 无扩展名文件（如 `README`）：extension 为空时跳过扩展名拼接
///
/// 返回路径统一使用 `/` 分隔符（兼容前端）
fn generate_unique_path(original: &str) -> Option<String> {
    let path = Path::new(original);
    let parent = path.parent()?;

    // 获取文件名（完整文件名，包含扩展名）
    let file_name = path.file_name()?;
    let file_name_str = file_name.to_string_lossy();

    // 获取文件名主体（不含扩展名）和扩展名
    // 注意：对于隐藏文件（如 .gitignore），file_stem 可能返回空或 None
    // 对于无扩展名文件（如 README），extension 返回 None
    let stem = path.file_stem();
    let ext = path.extension();

    let stem_str = stem.map(|s| s.to_string_lossy()).unwrap_or_default();
    // 将 Option<Cow<str>> 转换为 String 避免所有权问题
    let ext_str = ext.map(|e| e.to_string_lossy().into_owned());

    let mut counter = 1;
    loop {
        let new_name = if stem.is_none() || stem_str.is_empty() {
            // 情况1：隐藏文件（如 .gitignore）
            // 文件名格式：.gitignore → .gitignore (1)
            if ext.is_none() {
                // 无扩展名的隐藏文件（如 .hidden）
                format!("{} ({})", file_name_str, counter)
            } else {
                // 有扩展名的隐藏文件（如 .gitignore）
                // file_stem 为空，但我们有 extension
                format!(".{} ({})", ext_str.as_deref().unwrap_or_default(), counter)
            }
        } else if ext.is_none() {
            // 情况2：无扩展名文件（如 README）
            // 文件名格式：README → README (1)
            format!("{} ({})", stem_str, counter)
        } else {
            // 情况3：普通文件（如 notes.md）
            // 文件名格式：notes.md → notes (1).md
            format!(
                "{} ({}).{}",
                stem_str,
                counter,
                ext_str.as_deref().unwrap_or_default()
            )
        };

        let new_path = parent.join(&new_name);

        if !new_path.exists() {
            // 统一返回 `/` 分隔符给前端
            // Rust 的 Path 在 Windows 上使用 `\`，但前端期望 `/`
            return Some(new_path.to_string_lossy().replace('\\', "/"));
        }

        counter += 1;

        // 防止无限循环
        if counter > 1000 {
            return None;
        }
    }
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
