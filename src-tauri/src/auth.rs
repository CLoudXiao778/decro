use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::secure_store;

const API_BASE: &str = "https://music.163.com";
const AUTH_FILE: &str = "netease-auth.bin";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

#[derive(Default)]
pub struct AuthState {
    cookies: Mutex<Option<String>>,
    account: Mutex<Option<Account>>,
    qr_jars: Mutex<BTreeMap<String, BTreeMap<String, String>>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub user_id: String,
    pub nickname: String,
    pub avatar_url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QrStart {
    pub unikey: String,
    pub qr_url: String,
}

#[derive(Serialize)]
pub struct QrPoll {
    pub code: i32,
    pub message: String,
    pub account: Option<Account>,
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .redirect(reqwest::redirect::Policy::limited(5))
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

fn auth_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法定位应用数据目录: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建应用数据目录: {e}"))?;
    Ok(dir.join(AUTH_FILE))
}

fn load_cookies(app: &AppHandle) -> Option<String> {
    let path = auth_path(app).ok()?;
    let encrypted = fs::read(path).ok()?;
    let plain = secure_store::unprotect(&encrypted).ok()?;
    String::from_utf8(plain)
        .ok()
        .filter(|s| !s.trim().is_empty())
}

fn save_cookies(app: &AppHandle, cookies: &str) -> Result<(), String> {
    let path = auth_path(app)?;
    let encrypted = secure_store::protect(cookies.as_bytes())?;
    fs::write(path, encrypted).map_err(|e| format!("写入登录凭证失败: {e}"))
}

fn clear_cookies(app: &AppHandle) -> Result<(), String> {
    let path = auth_path(app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| format!("清除登录凭证失败: {e}"))?;
    }
    Ok(())
}

fn cookie_header(map: &BTreeMap<String, String>) -> String {
    map.iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<Vec<_>>()
        .join("; ")
}

fn merge_set_cookies(headers: &reqwest::header::HeaderMap, jar: &mut BTreeMap<String, String>) {
    for value in headers.get_all(reqwest::header::SET_COOKIE) {
        let Ok(raw) = value.to_str() else { continue };
        let Some(pair) = raw.split(';').next() else {
            continue;
        };
        let Some((name, val)) = pair.split_once('=') else {
            continue;
        };
        let name = name.trim();
        let val = val.trim();
        if !name.is_empty() && !val.is_empty() {
            jar.insert(name.to_string(), val.to_string());
        }
    }
}

async fn fetch_account(client: &reqwest::Client, cookies: &str) -> Result<Option<Account>, String> {
    let response = client
        .get(format!("{API_BASE}/api/nuser/account/get"))
        .header(reqwest::header::COOKIE, cookies)
        .header(reqwest::header::REFERER, format!("{API_BASE}/"))
        .send()
        .await
        .map_err(|e| format!("读取账号信息失败: {e}"))?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("账号信息格式异常: {e}"))?;

    let Some(profile) = json.get("profile") else {
        return Ok(None);
    };
    let nickname = profile
        .get("nickname")
        .and_then(|v| v.as_str())
        .unwrap_or("网易云用户")
        .to_string();
    let user_id = profile
        .get("userId")
        .map(|v| match v {
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::String(s) => s.clone(),
            _ => String::new(),
        })
        .unwrap_or_default();
    let avatar_url = profile
        .get("avatarUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if user_id.is_empty() {
        return Ok(None);
    }
    Ok(Some(Account {
        user_id,
        nickname,
        avatar_url,
    }))
}

#[tauri::command]
pub async fn qr_login_start(state: State<'_, AuthState>) -> Result<QrStart, String> {
    let response = client()
        .get(format!("{API_BASE}/api/login/qrcode/unikey?type=1"))
        .header(reqwest::header::REFERER, format!("{API_BASE}/"))
        .send()
        .await
        .map_err(|e| format!("获取登录二维码失败: {e}"))?;

    let mut jar = BTreeMap::new();
    merge_set_cookies(response.headers(), &mut jar);

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("登录二维码格式异常: {e}"))?;
    let unikey = json
        .get("unikey")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "网易云未返回二维码 key，请稍后重试".to_string())?
        .to_string();

    let mut jars = state
        .qr_jars
        .lock()
        .map_err(|_| "登录状态锁失败".to_string())?;
    // Only one login dialog is active at a time; drop abandoned keys.
    jars.clear();
    jars.insert(unikey.clone(), jar);

    Ok(QrStart {
        qr_url: format!("{API_BASE}/login?codekey={unikey}"),
        unikey,
    })
}

#[tauri::command]
pub async fn qr_login_poll(
    app: AppHandle,
    state: State<'_, AuthState>,
    key: String,
) -> Result<QrPoll, String> {
    let jar = state
        .qr_jars
        .lock()
        .map_err(|_| "登录状态锁失败".to_string())?
        .get(&key)
        .cloned()
        .unwrap_or_default();

    let mut request = client()
        .get(format!("{API_BASE}/api/login/qrcode/client/login"))
        .query(&[("key", key.as_str()), ("type", "1")])
        .header(reqwest::header::REFERER, format!("{API_BASE}/"));
    if !jar.is_empty() {
        request = request.header(reqwest::header::COOKIE, cookie_header(&jar));
    }
    let response = request
        .send()
        .await
        .map_err(|e| format!("轮询登录状态失败: {e}"))?;

    let mut jar = state
        .qr_jars
        .lock()
        .map_err(|_| "登录状态锁失败".to_string())?
        .remove(&key)
        .unwrap_or_default();
    merge_set_cookies(response.headers(), &mut jar);

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("登录状态格式异常: {e}"))?;
    let code = json.get("code").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let message = json
        .get("message")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if code == 803 {
        let cookies = cookie_header(&jar);
        let client = client();
        let Some(account) = fetch_account(&client, &cookies).await? else {
            return Err("扫码成功，但未能读取账号资料；请重试".to_string());
        };
        let saved = save_cookies(&app, &cookies);
        if let Ok(mut slot) = state.cookies.lock() {
            *slot = Some(cookies);
        }
        if let Ok(mut slot) = state.account.lock() {
            *slot = Some(account.clone());
        }
        return Ok(QrPoll {
            code,
            message: if saved.is_ok() {
                "登录成功，已在 Windows 数据保护下保存登录凭证".to_string()
            } else {
                "登录成功；凭证未能持久化，本次进程内有效".to_string()
            },
            account: Some(account),
        });
    }

    // Session-only cookies are not committed until code 803 + profile success.
    if code != 800 {
        state
            .qr_jars
            .lock()
            .map_err(|_| "登录状态锁失败".to_string())?
            .insert(key, jar);
    }
    Ok(QrPoll {
        code,
        message,
        account: None,
    })
}

#[tauri::command]
pub async fn auth_status(
    app: AppHandle,
    state: State<'_, AuthState>,
) -> Result<Option<Account>, String> {
    if let Ok(account) = state.account.lock() {
        if let Some(account) = account.clone() {
            return Ok(Some(account));
        }
    }

    let Some(cookies) = load_cookies(&app) else {
        return Ok(None);
    };
    let Some(account) = fetch_account(&client(), &cookies).await? else {
        return Ok(None);
    };
    if let Ok(mut slot) = state.cookies.lock() {
        *slot = Some(cookies);
    }
    if let Ok(mut slot) = state.account.lock() {
        *slot = Some(account.clone());
    }
    Ok(Some(account))
}

#[tauri::command]
pub async fn logout(app: AppHandle, state: State<'_, AuthState>) -> Result<(), String> {
    clear_cookies(&app)?;
    if let Ok(mut jars) = state.qr_jars.lock() {
        jars.clear();
    }
    if let Ok(mut slot) = state.cookies.lock() {
        *slot = None;
    }
    if let Ok(mut slot) = state.account.lock() {
        *slot = None;
    }
    Ok(())
}
