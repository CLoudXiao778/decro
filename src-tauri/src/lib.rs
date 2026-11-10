mod auth;
mod libnetease;
mod logger;
mod memory;
mod netease;
mod portable;
mod proxy;
mod secure_store;
mod state;

use rand::RngCore;
use state::{AppState, ProxyInfo};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Manager, WebviewWindowBuilder};

fn random_token() -> String {
    let mut bytes = [0u8; 24];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        logger::log("error", "panic", &info.to_string());
    }));
    libnetease::init();
    let listener =
        std::net::TcpListener::bind("127.0.0.1:0").expect("failed to bind local audio proxy");
    let address = listener
        .local_addr()
        .expect("failed to read local audio proxy address");
    let state = AppState::new(ProxyInfo {
        base: format!("http://{address}"),
        token: random_token(),
    });
    let proxy_state = state.clone();

    let was_minimized = Arc::new(AtomicBool::new(false));
    tauri::Builder::default()
        .manage(state)
        .on_window_event(move |window, event| {
            if window.label() != "main" {
                return;
            }
            if !matches!(
                event,
                tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Focused(_)
            ) {
                return;
            }
            let minimized = window.is_minimized().unwrap_or(false);
            if minimized && !was_minimized.swap(true, Ordering::Relaxed) {
                logger::log("info", "memory", "window minimized");
                let window = window.clone();
                let webview_window = window.app_handle().get_webview_window("main");
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(900));
                    if window.is_minimized().unwrap_or(false) {
                        if let Some(webview) = webview_window {
                            memory::set_webview_suspended(&webview, true);
                        }
                        std::thread::sleep(Duration::from_millis(350));
                        memory::trim_working_set("minimize", "info");
                    }
                });
            } else if !minimized && was_minimized.swap(false, Ordering::Relaxed) {
                logger::log("info", "memory", "window restored");
                if let Some(webview) = window.app_handle().get_webview_window("main") {
                    memory::set_webview_suspended(&webview, false);
                }
                memory::log_stats("restored", "info");
            }
        })
        .setup(move |app| {
            let data_dir = portable::init(app.handle());
            if let Ok(level) = std::fs::read_to_string(portable::log_level_path()) {
                let _ = logger::set_level(level.trim());
            }
            logger::init(portable::log_dir());
            logger::log(
                "info",
                "app",
                &format!("Decro Desktop starting; data={}", data_dir.display()),
            );

            // Create the window here instead of letting Tauri create it from
            // config, so WebView2's profile also lives under the portable data
            // directory. The window config keeps `create: false`.
            let window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "main")
                .cloned()
                .expect("main window config is required");
            WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                .data_directory(portable::webview_dir())
                .build()?;
            let memory_window = app.get_webview_window("main");
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(Duration::from_secs(5)).await;
                memory::log_stats("startup", "info");
                tokio::time::sleep(Duration::from_secs(10)).await;
                if memory_window
                    .as_ref()
                    .is_some_and(|window| !window.is_minimized().unwrap_or(false))
                {
                    logger::log("info", "memory", "idle-trim after startup");
                    memory::trim_working_set("idle", "info");
                }
                loop {
                    tokio::time::sleep(Duration::from_secs(60)).await;
                    memory::log_stats("periodic", "debug");
                    if let Some(window) = &memory_window {
                        if !window.is_minimized().unwrap_or(false)
                            && !window.is_focused().unwrap_or(false)
                        {
                            memory::trim_working_set("background", "debug");
                        }
                    }
                }
            });
            tauri::async_runtime::spawn(async move {
                if listener.set_nonblocking(true).is_err() {
                    logger::log("warn", "proxy", "failed to set non-blocking listener");
                    return;
                }
                let listener = match tokio::net::TcpListener::from_std(listener) {
                    Ok(listener) => listener,
                    Err(error) => {
                        logger::log("warn", "proxy", &format!("invalid listener: {error}"));
                        return;
                    }
                };
                if let Err(error) = proxy::serve(listener, proxy_state).await {
                    logger::log("warn", "proxy", &format!("server exited: {error}"));
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::qr_login_start,
            auth::qr_login_poll,
            auth::import_cookie,
            auth::auth_status,
            auth::logout,
            debug_log,
            open_log_folder,
            netease::home_feed,
            netease::library_data,
            netease::playlist_detail,
            netease::create_playlist,
            netease::subscribe_playlist,
            netease::artist_page,
            netease::album_page,
            netease::search_music,
            netease::search_kind,
            netease::lyric,
            netease::like_song,
            netease::report_play_start,
            set_log_level,
            netease::playback_config,
            open_song_page,
            open_playlist_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Decro Desktop");
}

#[tauri::command]
fn debug_log(level: String, target: String, message: String) {
    logger::log(&level, &target, &message);
}

#[tauri::command]
fn set_log_level(level: String) -> Result<(), String> {
    logger::set_level(&level)?;
    let _ = std::fs::write(portable::log_level_path(), level.trim());
    Ok(())
}

#[tauri::command]
fn open_log_folder() -> Result<(), String> {
    logger::open_folder()
}

#[tauri::command]
fn open_song_page(id: String) -> Result<(), String> {
    if id.is_empty() || !id.chars().all(|character| character.is_ascii_digit()) {
        return Err("歌曲 ID 无效".to_string());
    }
    open_url(&format!("https://music.163.com/#/song?id={id}"))
}

#[tauri::command]
fn open_playlist_page(id: String) -> Result<(), String> {
    if id.is_empty() || !id.chars().all(|character| character.is_ascii_digit()) {
        return Err("歌单 ID 无效".to_string());
    }
    open_url(&format!("https://music.163.com/#/playlist?id={id}"))
}

fn open_url(url: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("打开浏览器失败: {error}"))
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("打开浏览器失败: {error}"))
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("打开浏览器失败: {error}"))
    }
}
