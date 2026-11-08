mod auth;
mod secure_store;

use auth::AuthState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AuthState::default())
        .invoke_handler(tauri::generate_handler![
            auth::qr_login_start,
            auth::qr_login_poll,
            auth::auth_status,
            auth::logout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Cirro Desktop");
}
