use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

struct Logger {
    path: PathBuf,
    file: Mutex<File>,
}

static LOGGER: OnceLock<Logger> = OnceLock::new();

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

pub fn init(dir: PathBuf) {
    if LOGGER.get().is_some() {
        return;
    }
    if fs::create_dir_all(&dir).is_err() {
        return;
    }
    let path = dir.join("decro.log");
    let file = OpenOptions::new().create(true).append(true).open(&path);
    let Ok(file) = file else { return };
    let _ = LOGGER.set(Logger {
        path,
        file: Mutex::new(file),
    });
    log("info", "app", "logger initialized");
}

pub fn log(level: &str, target: &str, message: &str) {
    let clean: String = message
        .replace(['\r', '\n'], " ")
        .chars()
        .take(4000)
        .collect();
    if let Some(logger) = LOGGER.get() {
        if let Ok(mut file) = logger.file.lock() {
            let _ = writeln!(
                file,
                "ts={} level={} target={} {}",
                now_ms(),
                level,
                target,
                clean
            );
            let _ = file.flush();
        }
    }
    eprintln!("[decro][{level}][{target}] {clean}");
}

pub fn open_folder() -> Result<(), String> {
    let Some(logger) = LOGGER.get() else {
        return Err("日志尚未初始化".to_string());
    };
    let Some(parent) = logger.path.parent() else {
        return Err("日志目录不可用".to_string());
    };
    open_path(parent)
}

#[cfg(target_os = "windows")]
fn open_path(path: &Path) -> Result<(), String> {
    std::process::Command::new("explorer.exe")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("打开日志目录失败: {e}"))
}

#[cfg(target_os = "macos")]
fn open_path(path: &Path) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("打开日志目录失败: {e}"))
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_path(path: &Path) -> Result<(), String> {
    std::process::Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("打开日志目录失败: {e}"))
}
