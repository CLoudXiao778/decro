//! Portable data layout.
//!
//! Everything that used to live under `%APPDATA%` / `%LOCALAPPDATA%` now lives
//! next to the executable:
//!
//! ```text
//! Decro Desktop.exe
//! data/
//!   netease-auth.bin
//!   logs/decro.log
//!   webview/EBWebView/...   (WebView2 profile: localStorage, cache, cookies)
//! ```
//!
//! The one-time migration from the old AppData layout shipped only in 0.5.8
//! and has been removed. Upgrades from 0.5.9 onward are just an executable
//! replacement; the `data/` directory stays untouched.

use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

use tauri::{AppHandle, Manager};

const AUTH_FILE: &str = "netease-auth.bin";

static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn init(app: &AppHandle) -> PathBuf {
    let dir = portable_data_dir()
        .or_else(|| {
            app.path()
                .app_data_dir()
                .ok()
                .filter(|dir| fs::create_dir_all(dir).is_ok())
        })
        .unwrap_or_else(|| std::env::temp_dir().join("decro-desktop-data"));

    let _ = fs::create_dir_all(&dir);
    let _ = DATA_DIR.set(dir.clone());
    dir
}

pub fn data_dir() -> PathBuf {
    DATA_DIR
        .get()
        .cloned()
        .unwrap_or_else(|| std::env::temp_dir().join("decro-desktop-data"))
}

pub fn auth_path() -> PathBuf {
    data_dir().join(AUTH_FILE)
}

pub fn log_dir() -> PathBuf {
    data_dir().join("logs")
}

pub fn webview_dir() -> PathBuf {
    data_dir().join("webview")
}

fn portable_data_dir() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let parent = exe.parent()?;
    let dir = parent.join("data");
    fs::create_dir_all(&dir).ok()?;
    // A read-only install directory should fall back instead of giving
    // WebView2 a profile path it cannot write to.
    let probe = dir.join(".write-test");
    fs::write(&probe, b"ok").ok()?;
    let _ = fs::remove_file(probe);
    Some(dir)
}
