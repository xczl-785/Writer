use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use url::Url;

pub const SUPPORTED_EXTENSIONS: [&str; 2] = ["md", "markdown"];

#[derive(Debug, Clone, Serialize)]
pub struct StartupArgs {
    pub file_path: Option<String>,
}

pub fn is_supported_file(path: &std::path::Path) -> bool {
    if let Some(ext) = path.extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        return SUPPORTED_EXTENSIONS.contains(&ext_lower.as_str());
    }
    false
}

fn parse_file_from_arg(arg: &str) -> Option<String> {
    if arg.starts_with('-') {
        return None;
    }

    let direct_path = PathBuf::from(arg);
    if direct_path.exists() && is_supported_file(&direct_path) {
        return Some(direct_path.to_string_lossy().to_string());
    }

    let path = if let Ok(url) = Url::parse(arg) {
        if url.scheme() == "file" {
            url.to_file_path().ok()?
        } else {
            return None;
        }
    } else {
        PathBuf::from(arg)
    };

    if path.exists() && is_supported_file(&path) {
        return Some(path.to_string_lossy().to_string());
    }
    None
}

impl StartupArgs {
    #[cfg(any(windows, target_os = "linux"))]
    pub fn from_args() -> Self {
        use std::env;
        let args: Vec<String> = env::args().collect();
        let file_path = args.iter().skip(1).find_map(|arg| parse_file_from_arg(arg));
        Self { file_path }
    }

    #[cfg(any(target_os = "macos", target_os = "ios"))]
    pub fn from_args() -> Self {
        Self { file_path: None }
    }
}

pub struct FileOpenState {
    pub pending_file: Mutex<Option<String>>,
}

impl FileOpenState {
    pub fn new() -> Self {
        Self {
            pending_file: Mutex::new(None),
        }
    }

    pub fn set_pending_file(&self, path: String) {
        if let Ok(mut pending) = self.pending_file.lock() {
            *pending = Some(path);
        }
    }

    pub fn get_and_clear_pending_file(&self) -> Option<String> {
        if let Ok(mut pending) = self.pending_file.lock() {
            pending.take()
        } else {
            None
        }
    }
}

impl Default for FileOpenState {
    fn default() -> Self {
        Self::new()
    }
}

pub fn parse_urls_to_files(urls: Vec<Url>) -> Vec<String> {
    urls.into_iter()
        .filter_map(|url| {
            if url.scheme() == "file" {
                if let Ok(path) = url.to_file_path() {
                    if path.exists() && is_supported_file(&path) {
                        return Some(path.to_string_lossy().to_string());
                    }
                }
            }
            None
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::parse_file_from_arg;
    use tempfile::tempdir;
    use url::Url;

    #[test]
    fn parse_file_from_arg_accepts_existing_windows_style_paths_before_url_parsing() {
        let dir = tempdir().expect("temp dir");
        let file_path = dir.path().join("sample.md");
        std::fs::write(&file_path, "# test").expect("write markdown file");

        let parsed = parse_file_from_arg(&file_path.to_string_lossy())
            .expect("expected direct file path to be accepted");

        assert_eq!(parsed, file_path.to_string_lossy());
    }

    #[test]
    fn parse_file_from_arg_accepts_file_urls() {
        let dir = tempdir().expect("temp dir");
        let file_path = dir.path().join("sample.markdown");
        std::fs::write(&file_path, "# test").expect("write markdown file");
        let file_url = Url::from_file_path(&file_path)
            .expect("file url")
            .to_string();

        let parsed = parse_file_from_arg(&file_url).expect("expected file URL to be accepted");

        assert_eq!(parsed, file_path.to_string_lossy());
    }

    #[test]
    fn parse_file_from_arg_rejects_non_file_urls() {
        assert!(parse_file_from_arg("https://example.com/readme.md").is_none());
    }
}
