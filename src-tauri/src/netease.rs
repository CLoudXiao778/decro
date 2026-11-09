use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::time::{Duration, Instant};
use tauri::State;

use crate::state::{AppState, API_BASE};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackDto {
    pub id: String,
    pub name: String,
    pub artist: String,
    pub album: String,
    pub duration_ms: u64,
    pub cover_url: String,
    pub fee: i64,
    pub quality: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistDto {
    pub id: String,
    pub name: String,
    pub cover_url: String,
    pub track_count: u64,
    pub play_count: u64,
    pub description: String,
    pub creator: String,
    pub special_type: i64,
    pub update_time: u64,
    pub tracks: Vec<TrackDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeFeed {
    pub recommended: Vec<PlaylistDto>,
    pub new_songs: Vec<TrackDto>,
    pub daily: Vec<TrackDto>,
    pub recent: Vec<TrackDto>,
    pub user_playlists: Vec<PlaylistDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryData {
    pub playlists: Vec<PlaylistDto>,
    pub recent: Vec<TrackDto>,
    pub liked: Option<PlaylistDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchData {
    pub songs: Vec<TrackDto>,
    pub playlists: Vec<PlaylistDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricLine {
    pub time: f64,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub translation: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricData {
    pub lines: Vec<LyricLine>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackConfig {
    pub base: String,
    pub token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LikeResult {
    pub liked: bool,
}

async fn get_json(state: &AppState, path: &str, query: &[(&str, String)]) -> Result<Value, String> {
    let mut request = state
        .api
        .get(format!("{API_BASE}{path}"))
        .query(query)
        .header(reqwest::header::REFERER, format!("{API_BASE}/"));
    if let Some(cookies) = state.cookie_header() {
        request = request.header(reqwest::header::COOKIE, cookies);
    }
    let response = request
        .send()
        .await
        .map_err(|e| format!("网易云请求失败: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("网易云接口返回 HTTP {}", response.status()));
    }
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("网易云响应格式异常: {e}"))?;
    check_code(&json)?;
    Ok(json)
}

fn check_code(json: &Value) -> Result<(), String> {
    let Some(code) = json.get("code").and_then(Value::as_i64) else {
        return Ok(());
    };
    if code == 200 || code == 0 {
        return Ok(());
    }
    let message = json
        .get("message")
        .or_else(|| json.get("msg"))
        .and_then(Value::as_str)
        .filter(|message| !message.is_empty())
        .unwrap_or("网易云拒绝了这次请求，请稍后重试");
    Err(format!("网易云：{message}（{code}）"))
}

fn value_string(value: &Value) -> Option<String> {
    match value {
        Value::String(text) if !text.trim().is_empty() => Some(text.clone()),
        Value::Number(number) => Some(number.to_string()),
        _ => None,
    }
}

fn sized_cover(url: &str) -> String {
    let url = https_url(url);
    if url.contains('?') {
        format!("{url}&param=500y500")
    } else {
        format!("{url}?param=500y500")
    }
}

fn https_url(url: &str) -> String {
    url.strip_prefix("http://")
        .map(|rest| format!("https://{rest}"))
        .unwrap_or_else(|| url.to_string())
}

fn has_object(value: &Value, key: &str) -> bool {
    value.get(key).is_some_and(|item| !item.is_null())
}

pub fn normalize_song(value: &Value) -> Option<TrackDto> {
    let id = value.get("id").and_then(value_string)?;
    let name = value
        .get("name")
        .or_else(|| value.get("title"))
        .and_then(Value::as_str)
        .unwrap_or("未知歌曲")
        .to_string();

    let artists = value
        .get("ar")
        .or_else(|| value.get("artists"))
        .and_then(Value::as_array)
        .map(|list| {
            list.iter()
                .filter_map(|artist| artist.get("name").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join(" / ")
        })
        .filter(|text| !text.is_empty())
        .unwrap_or_else(|| "未知艺人".to_string());

    let album_value = value.get("al").or_else(|| value.get("album"));
    let album = album_value
        .and_then(|album| album.get("name"))
        .and_then(Value::as_str)
        .unwrap_or("未知专辑")
        .to_string();
    let cover = album_value
        .and_then(|album| {
            album
                .get("picUrl")
                .or_else(|| album.get("blurPicUrl"))
                .and_then(Value::as_str)
        })
        .or_else(|| value.get("picUrl").and_then(Value::as_str))
        .map(sized_cover)
        .unwrap_or_default();

    let duration_ms = value
        .get("dt")
        .or_else(|| value.get("duration"))
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let fee = value.get("fee").and_then(Value::as_i64).unwrap_or(0);

    let quality = if has_object(value, "hr") || has_object(value, "hrMusic") {
        "Hi-Res"
    } else if has_object(value, "sq") || has_object(value, "sqMusic") {
        "SQ"
    } else if has_object(value, "h") || has_object(value, "hMusic") {
        "HQ"
    } else {
        "标准"
    }
    .to_string();

    Some(TrackDto {
        id,
        name,
        artist: artists,
        album,
        duration_ms,
        cover_url: cover,
        fee,
        quality,
    })
}

fn normalize_tracks(value: Option<&Value>) -> Vec<TrackDto> {
    value
        .and_then(Value::as_array)
        .map(|items| items.iter().filter_map(normalize_song).collect())
        .unwrap_or_default()
}

pub fn normalize_playlist(value: &Value) -> Option<PlaylistDto> {
    let id = value.get("id").and_then(value_string)?;
    let tracks = normalize_tracks(value.get("tracks"));
    let track_count = value
        .get("trackCount")
        .and_then(Value::as_u64)
        .unwrap_or(tracks.len() as u64);
    let play_count = value.get("playCount").and_then(Value::as_u64).unwrap_or(0);
    let cover_url = value
        .get("coverImgUrl")
        .or_else(|| value.get("picUrl"))
        .and_then(Value::as_str)
        .map(sized_cover)
        .unwrap_or_default();
    let creator = value
        .get("creator")
        .and_then(|creator| creator.get("nickname"))
        .and_then(Value::as_str)
        .unwrap_or("网易云音乐")
        .to_string();
    let description = value
        .get("description")
        .or_else(|| value.get("copywriter"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let special_type = value
        .get("specialType")
        .and_then(Value::as_i64)
        .unwrap_or(0);
    let update_time = value.get("updateTime").and_then(Value::as_u64).unwrap_or(0);

    Some(PlaylistDto {
        id,
        name: value
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or("未命名歌单")
            .to_string(),
        cover_url,
        track_count,
        play_count,
        description,
        creator,
        special_type,
        update_time,
        tracks,
    })
}

fn playlists_from(value: Option<&Value>) -> Vec<PlaylistDto> {
    value
        .and_then(Value::as_array)
        .map(|items| items.iter().filter_map(normalize_playlist).collect())
        .unwrap_or_default()
}

fn parse_daily(value: &Value) -> Vec<TrackDto> {
    let daily = normalize_tracks(value.pointer("/data/dailySongs"));
    if !daily.is_empty() {
        return daily;
    }
    value
        .get("recommend")
        .and_then(Value::as_array)
        .map(|items| items.iter().filter_map(normalize_song).collect())
        .unwrap_or_default()
}

fn parse_recent(value: &Value) -> Vec<TrackDto> {
    let list = value
        .get("allData")
        .or_else(|| value.get("weekData"))
        .and_then(Value::as_array);
    list.map(|items| {
        items
            .iter()
            .map(|item| item.get("song").unwrap_or(item))
            .filter_map(normalize_song)
            .collect()
    })
    .unwrap_or_default()
}

#[tauri::command]
pub async fn home_feed(state: State<'_, AppState>) -> Result<HomeFeed, String> {
    let recommended_query = [("limit", "12".to_string())];
    let new_songs_query = [("limit", "12".to_string())];
    let (recommended_json, new_songs_json) = tokio::join!(
        get_json(&state, "/api/personalized/playlist", &recommended_query),
        get_json(&state, "/api/personalized/newsong", &new_songs_query),
    );
    if recommended_json.is_err() && new_songs_json.is_err() {
        return Err(recommended_json
            .err()
            .or_else(|| new_songs_json.err())
            .unwrap_or_else(|| "首页加载失败".to_string()));
    }

    let recommended = recommended_json
        .ok()
        .map(|value| playlists_from(value.get("result")))
        .unwrap_or_default();
    let new_songs = new_songs_json
        .ok()
        .and_then(|value| {
            value.get("result").and_then(Value::as_array).map(|items| {
                items
                    .iter()
                    .map(|item| item.get("song").unwrap_or(item))
                    .filter_map(normalize_song)
                    .collect()
            })
        })
        .unwrap_or_default();

    let mut daily = Vec::new();
    let mut recent = Vec::new();
    let mut user_playlists = Vec::new();

    if let Some(account) = state.account() {
        let uid = account.user_id;
        let daily_query = [("limit", "30".to_string())];
        let recent_query = [
            ("uid", uid.clone()),
            ("type", "1".to_string()),
            ("limit", "60".to_string()),
        ];
        let playlists_query = [
            ("uid", uid),
            ("limit", "100".to_string()),
            ("offset", "0".to_string()),
        ];
        let (daily_result, recent_result, playlists_result) = tokio::join!(
            get_json(&state, "/api/v3/discovery/recommend/songs", &daily_query,),
            get_json(&state, "/api/v1/play/record", &recent_query),
            get_json(&state, "/api/user/playlist", &playlists_query),
        );

        if let Ok(value) = daily_result {
            daily = parse_daily(&value);
        }
        if let Ok(value) = recent_result {
            recent = parse_recent(&value);
        }
        if let Ok(value) = playlists_result {
            user_playlists = playlists_from(value.get("playlist"));
        }
    }

    Ok(HomeFeed {
        recommended,
        new_songs,
        daily,
        recent,
        user_playlists,
    })
}

async fn fetch_playlist_detail(state: &AppState, id: &str) -> Result<PlaylistDto, String> {
    let value = get_json(
        state,
        "/api/v6/playlist/detail",
        &[
            ("id", id.to_string()),
            ("n", "100000".to_string()),
            ("s", "8".to_string()),
        ],
    )
    .await?;
    value
        .get("playlist")
        .and_then(normalize_playlist)
        .ok_or_else(|| "歌单不存在、已下架或不可访问".to_string())
}

#[tauri::command]
pub async fn playlist_detail(
    state: State<'_, AppState>,
    id: String,
) -> Result<PlaylistDto, String> {
    fetch_playlist_detail(&state, &id).await
}

#[tauri::command]
pub async fn library_data(state: State<'_, AppState>) -> Result<LibraryData, String> {
    let account = state
        .account()
        .ok_or_else(|| "请先登录网易云".to_string())?;
    let uid = account.user_id;

    let playlists_query = [
        ("uid", uid.clone()),
        ("limit", "100".to_string()),
        ("offset", "0".to_string()),
    ];
    let recent_query = [
        ("uid", uid),
        ("type", "1".to_string()),
        ("limit", "60".to_string()),
    ];
    let (playlists_result, recent_result) = tokio::join!(
        get_json(&state, "/api/user/playlist", &playlists_query),
        get_json(&state, "/api/v1/play/record", &recent_query),
    );

    let playlists = playlists_result
        .ok()
        .map(|value| playlists_from(value.get("playlist")))
        .unwrap_or_default();
    let recent = recent_result
        .ok()
        .map(|value| parse_recent(&value))
        .unwrap_or_default();

    let liked_summary = playlists
        .iter()
        .find(|playlist| playlist.special_type == 5)
        .or_else(|| {
            playlists
                .iter()
                .find(|playlist| playlist.name.contains("喜欢的音乐"))
        })
        .cloned();

    let liked = match liked_summary {
        Some(summary) => fetch_playlist_detail(&state, &summary.id).await.ok(),
        None => None,
    };

    Ok(LibraryData {
        playlists,
        recent,
        liked,
    })
}

#[tauri::command]
pub async fn search_music(
    state: State<'_, AppState>,
    keyword: String,
) -> Result<SearchData, String> {
    let keyword = keyword.trim().to_string();
    if keyword.is_empty() {
        return Ok(SearchData {
            songs: Vec::new(),
            playlists: Vec::new(),
        });
    }

    let song_query = [
        ("s", keyword.clone()),
        ("type", "1".to_string()),
        ("limit", "30".to_string()),
        ("offset", "0".to_string()),
    ];
    let playlist_query = [
        ("s", keyword),
        ("type", "1000".to_string()),
        ("limit", "12".to_string()),
        ("offset", "0".to_string()),
    ];
    let (songs_result, playlists_result) = tokio::join!(
        get_json(&state, "/api/cloudsearch/pc", &song_query),
        get_json(&state, "/api/cloudsearch/pc", &playlist_query),
    );

    if songs_result.is_err() && playlists_result.is_err() {
        return Err(songs_result
            .err()
            .or_else(|| playlists_result.err())
            .unwrap_or_else(|| "搜索失败，请稍后再试".to_string()));
    }

    let songs = songs_result
        .ok()
        .and_then(|value| {
            value
                .pointer("/result/songs")
                .and_then(Value::as_array)
                .map(|items| items.iter().filter_map(normalize_song).collect())
        })
        .unwrap_or_default();
    let playlists = playlists_result
        .ok()
        .and_then(|value| {
            value
                .pointer("/result/playlists")
                .and_then(Value::as_array)
                .map(|items| items.iter().filter_map(normalize_playlist).collect())
        })
        .unwrap_or_default();

    Ok(SearchData { songs, playlists })
}

fn parse_lrc(text: &str) -> Vec<(f64, String)> {
    let mut lines = Vec::new();
    for raw in text.lines() {
        let mut rest = raw.trim();
        let mut times = Vec::new();
        while rest.starts_with('[') {
            let Some(end) = rest.find(']') else { break };
            let tag = &rest[1..end];
            if let Some(time) = parse_lrc_time(tag) {
                times.push(time);
            }
            rest = &rest[end + 1..];
        }
        let content = rest.trim();
        if content.is_empty() {
            continue;
        }
        for time in times {
            lines.push((time, content.to_string()));
        }
    }
    lines.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    lines
}

fn parse_lrc_time(tag: &str) -> Option<f64> {
    let (minutes, seconds) = tag.split_once(':')?;
    let minutes: f64 = minutes.trim().parse().ok()?;
    let seconds: f64 = seconds.trim().parse().ok()?;
    Some(minutes * 60.0 + seconds)
}

#[tauri::command]
pub async fn lyric(state: State<'_, AppState>, id: String) -> Result<LyricData, String> {
    let value = get_json(
        &state,
        "/api/song/lyric",
        &[
            ("id", id),
            ("lv", "-1".to_string()),
            ("kv", "-1".to_string()),
            ("tv", "-1".to_string()),
        ],
    )
    .await?;

    let original = value
        .pointer("/lrc/lyric")
        .and_then(Value::as_str)
        .unwrap_or("");
    let translated = value
        .pointer("/tlyric/lyric")
        .and_then(Value::as_str)
        .unwrap_or("");

    let mut translations: BTreeMap<i64, String> = BTreeMap::new();
    for (time, text) in parse_lrc(translated) {
        translations.insert((time * 1000.0).round() as i64, text);
    }

    let lines = parse_lrc(original)
        .into_iter()
        .map(|(time, text)| {
            let key = (time * 1000.0).round() as i64;
            LyricLine {
                time,
                text,
                translation: translations.get(&key).cloned(),
            }
        })
        .collect();

    Ok(LyricData { lines })
}

#[tauri::command]
pub async fn like_song(
    state: State<'_, AppState>,
    id: String,
    like: bool,
) -> Result<LikeResult, String> {
    if state.account().is_none() {
        return Err("请先登录网易云".to_string());
    }
    let id_for_log = id.clone();
    tokio::task::spawn_blocking(move || crate::libnetease::song_like(&id, like))
        .await
        .map_err(|e| format!("喜欢操作线程失败: {e}"))??;
    crate::logger::log("info", "like", &format!("id={id_for_log} like={like}"));
    Ok(LikeResult { liked: like })
}

#[tauri::command]
pub fn playback_config(state: State<'_, AppState>) -> PlaybackConfig {
    PlaybackConfig {
        base: state.proxy.base.clone(),
        token: state.proxy.token.clone(),
    }
}

/// Resolve a playable CDN URL through libnetease's weapi/eapi implementation.
/// The original Cirro library adds the `os=ios`/`appver` cookie pair that the
/// player URL endpoint requires; a plain web request gets `url: null`.
pub async fn resolve_song_url(state: &AppState, id: &str) -> Result<String, String> {
    if id.is_empty() || !id.chars().all(|ch| ch.is_ascii_digit()) {
        return Err("无效的歌曲 ID".to_string());
    }

    if let Ok(cache) = state.url_cache.lock() {
        if let Some((url, at)) = cache.get(id) {
            if at.elapsed() < Duration::from_secs(240) {
                return Ok(url.clone());
            }
        }
    }

    let id_owned = id.to_string();
    let url = tokio::task::spawn_blocking(move || {
        let mut last_error = String::new();
        for level in ["standard", "exhigh"] {
            match crate::libnetease::song_url(&id_owned, level) {
                Ok(url) => return Ok(url),
                Err(error) => {
                    crate::logger::log(
                        "debug",
                        "song",
                        &format!("id={id_owned} level={level} failed: {error}"),
                    );
                    last_error = error;
                }
            }
        }
        Err(if last_error.is_empty() {
            "该歌曲暂不可播放".to_string()
        } else {
            last_error
        })
    })
    .await
    .map_err(|e| format!("音源解析线程失败: {e}"))??;

    let url = url
        .strip_prefix("http://")
        .map(|rest| format!("https://{rest}"))
        .unwrap_or_else(|| url.to_string());
    let parsed = reqwest::Url::parse(&url).map_err(|_| "音源地址格式异常".to_string())?;
    if parsed.scheme() != "https" {
        return Err("音源地址必须使用 HTTPS".to_string());
    }
    if !parsed
        .host_str()
        .is_some_and(crate::state::is_allowed_audio_host)
    {
        return Err("音源地址不在允许的网易云域名内".to_string());
    }

    crate::logger::log(
        "debug",
        "song",
        &format!(
            "id={} url_host={}",
            id,
            reqwest::Url::parse(&url)
                .ok()
                .and_then(|parsed| parsed.host_str().map(str::to_string))
                .unwrap_or_else(|| "?".to_string())
        ),
    );
    if let Ok(mut cache) = state.url_cache.lock() {
        cache.insert(id.to_string(), (url.clone(), Instant::now()));
    }
    Ok(url)
}
