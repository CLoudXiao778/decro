mod auth;
mod libnetease;
mod logger;
mod netease;
mod portable;
mod proxy;
mod secure_store;
mod state;

use rand::RngCore;
use state::{AppState, ProxyInfo};
use tauri::WebviewWindowBuilder;

fn random_token() -> String {
    let mut bytes = [0u8; 24];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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

    tauri::Builder::default()
        .manage(state)
        .setup(move |app| {
            let data_dir = portable::init(app.handle());
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
            tauri::async_runtime::spawn(async move {
                if listener.set_nonblocking(true).is_err() {
                    logger::log("error", "proxy", "failed to set non-blocking listener");
                    return;
                }
                let listener = match tokio::net::TcpListener::from_std(listener) {
                    Ok(listener) => listener,
                    Err(error) => {
                        logger::log("error", "proxy", &format!("invalid listener: {error}"));
                        return;
                    }
                };
                if let Err(error) = proxy::serve(listener, proxy_state).await {
                    logger::log("error", "proxy", &format!("server exited: {error}"));
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
