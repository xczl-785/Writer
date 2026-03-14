// src-tauri/src/watcher.rs
// File system watcher using notify crate

use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher as NotifyWatcher};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

/// 全局文件监听器状态
pub struct WatcherState {
    pub watcher: Option<Arc<Mutex<RecommendedWatcher>>>,
    pub watched_paths: Vec<PathBuf>,
    pub is_running: AtomicBool,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            watcher: None,
            watched_paths: vec![],
            is_running: AtomicBool::new(false),
        }
    }
}

impl Default for WatcherState {
    fn default() -> Self {
        Self::new()
    }
}

/// 文件变更事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
}

/// 开始监听文件变化
#[tauri::command]
pub fn start_watching(
    app: AppHandle,
    paths: Vec<String>,
    state: State<'_, Mutex<WatcherState>>,
) -> Result<(), String> {
    let mut guard = state.lock().unwrap();

    // 已存在则先停止旧监听
    if guard.is_running.load(Ordering::Relaxed) {
        drop(guard);
        stop_watching(state.clone())?;
        guard = state.lock().unwrap();
    }

    // 创建监听器（300ms 防抖）
    let mut watcher = RecommendedWatcher::new(
        move |event: Result<Event, notify::Error>| {
            if let Ok(event) = event {
                let _ = app.emit(
                    "writer://file-change",
                    FileChangeEvent {
                        kind: format!("{:?}", event.kind),
                        paths: event
                            .paths
                            .iter()
                            .map(|p| p.to_string_lossy().to_string())
                            .collect(),
                    },
                );
            }
        },
        Config::default().with_poll_interval(std::time::Duration::from_millis(300)),
    )
    .map_err(|e| e.to_string())?;

    // 添加监听路径
    for path in &paths {
        let path_obj = Path::new(path);
        if path_obj.exists() {
            watcher
                .watch(path_obj, RecursiveMode::Recursive)
                .map_err(|e| e.to_string())?;
        }
    }

    // 存储 watcher
    let watcher_arc = Arc::new(Mutex::new(watcher));
    guard.watcher = Some(watcher_arc);
    guard.watched_paths = paths.into_iter().map(PathBuf::from).collect();
    guard.is_running.store(true, Ordering::Relaxed);

    Ok(())
}

/// 停止监听
#[tauri::command]
pub fn stop_watching(state: State<'_, Mutex<WatcherState>>) -> Result<(), String> {
    let mut guard = state.lock().unwrap();

    if let Some(watcher_arc) = guard.watcher.take() {
        // 显式 drop watcher，停止监听
        drop(watcher_arc);
    }

    guard.watched_paths.clear();
    guard.is_running.store(false, Ordering::Relaxed);

    Ok(())
}

/// 更新监听路径
#[tauri::command]
pub fn update_watch_paths(
    app: AppHandle,
    new_paths: Vec<String>,
    state: State<'_, Mutex<WatcherState>>,
) -> Result<(), String> {
    // 停止旧监听
    stop_watching(state.clone())?;
    // 启动新监听
    start_watching(app, new_paths, state)
}

/// 获取监听状态
#[tauri::command]
pub fn get_watcher_status(state: State<'_, Mutex<WatcherState>>) -> Result<WatcherStatus, String> {
    let guard = state.lock().unwrap();
    Ok(WatcherStatus {
        is_running: guard.is_running.load(Ordering::Relaxed),
        path_count: guard.watched_paths.len(),
        paths: guard
            .watched_paths
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect(),
    })
}

/// 监听器状态
#[derive(Debug, Serialize, Deserialize)]
pub struct WatcherStatus {
    pub is_running: bool,
    pub path_count: usize,
    pub paths: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_watcher_state_creation() {
        let state = WatcherState::new();
        assert!(!state.is_running.load(Ordering::Relaxed));
        assert!(state.watcher.is_none());
        assert!(state.watched_paths.is_empty());
    }

    #[test]
    fn test_watcher_state_default() {
        let state = WatcherState::default();
        assert!(!state.is_running.load(Ordering::Relaxed));
    }
}
