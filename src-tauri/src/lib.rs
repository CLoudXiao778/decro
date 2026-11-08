mod auth;
mod netease;
mod proxy;
mod secure_store;
mod state;

use rand::RngCore;
use state::{AppState, ProxyInfo};

fn random_token() -> String {
    let mut bytes = [0u8; 24];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        .setup(move |_app| {
            tauri::async_runtime::spawn(async move {
                if listener.set_nonblocking(true).is_err() {
                    eprintln!("audio proxy: failed to set non-blocking listener");
                    return;
                }
                let listener = match tokio::net::TcpListener::from_std(listener) {
                    Ok(listener) => listener,
                    Err(error) => {
                        eprintln!("audio proxy: invalid listener: {error}");
                        return;
                    }
                };
                if let Err(error) = proxy::serve(listener, proxy_state).await {
                    eprintln!("audio proxy: {error}");
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
            netease::home_feed,
            netease::library_data,
            netease::playlist_detail,
            netease::search_music,
            netease::lyric,
            netease::like_song,
            netease::playback_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Cirro Desktop");
}
