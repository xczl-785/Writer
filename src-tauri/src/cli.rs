use serde::Serialize;
use std::env;
use std::path::Path;

/// 启动时传入的参数
#[derive(Debug, Clone, Serialize)]
pub struct StartupArgs {
    /// 被双击的文件路径（如果存在）
    pub file_path: Option<String>,
}

impl StartupArgs {
    /// 从命令行参数解析启动参数
    pub fn from_args() -> Self {
        let args: Vec<String> = env::args().collect();

        // 跳过第一个参数（程序自身路径）
        // 如果有第二个参数且是文件路径，则视为要打开的文件
        let file_path = args.get(1).and_then(|arg| {
            // 检查路径是否存在
            let path = Path::new(arg);
            if path.exists() {
                // 检查是否是支持的文件扩展名
                if let Some(ext) = path.extension() {
                    let ext_lower = ext.to_string_lossy().to_lowercase();
                    if ext_lower == "md" || ext_lower == "markdown" {
                        return Some(arg.clone());
                    }
                }
            }
            None
        });

        Self { file_path }
    }
}
