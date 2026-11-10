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
//! The one-time migration from the old AppData layout is intentionally kept
//! only for this release; remove `migrate_*` helpers in the next version.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use tauri::{AppHandle, Manager};

const AUTH_FILE: &str = "netease-auth.bin";
const LEGACY_IDENTIFIER: &str = "io.github.cloudxiao778.cirrodesktop";

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

    migrate_auth(app, &dir);
    migrate_webview_storage(app, &dir);
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

fn appdata_candidates(app: &AppHandle, file: &str) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(current) = app.path().app_data_dir() {
        paths.push(current.join(file));
        if let Some(parent) = current.parent() {
            paths.push(parent.join(LEGACY_IDENTIFIER).join(file));
        }
    }
    paths
}

fn localdata_candidates(app: &AppHandle) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(current) = app.path().app_local_data_dir() {
        paths.push(current.clone());
        if let Some(parent) = current.parent() {
            paths.push(parent.join(LEGACY_IDENTIFIER));
        }
    }
    paths.sort();
    paths.dedup();
    paths
}

fn migrate_auth(app: &AppHandle, data_dir: &Path) {
    let target = data_dir.join(AUTH_FILE);
    if target.exists() {
        return;
    }
    for source in appdata_candidates(app, AUTH_FILE) {
        if !source.is_file() {
            continue;
        }
        if let Some(parent) = target.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if fs::copy(&source, &target).is_ok() {
            eprintln!("[decro][portable] migrated auth from {}", source.display());
            return;
        }
    }
}

fn migrate_webview_storage(app: &AppHandle, data_dir: &Path) {
    let target = data_dir
        .join("webview")
        .join("EBWebView")
        .join("Default")
        .join("Local Storage");
    if target.exists() {
        return;
    }
    for root in localdata_candidates(app) {
        let source = root.join("EBWebView").join("Default").join("Local Storage");
        if !source.is_dir() {
            continue;
        }
        if copy_dir_all(&source, &target).is_ok() {
            eprintln!(
                "[decro][portable] migrated webview storage from {}",
                source.display()
            );
            return;
        }
    }
}

fn copy_dir_all(source: &Path, target: &Path) -> io::Result<()> {
    fs::create_dir_all(target)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let destination = target.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_all(&entry.path(), &destination)?;
        } else if file_type.is_file() {
            fs::copy(entry.path(), destination)?;
        }
    }
    Ok(())
}
