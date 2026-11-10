//! Windows working-set accounting and trimming.
//!
//! Task Manager's "Memory" column is the process working set. WebView2 is a
//! separate browser process tree, so the total is the app process plus all
//! descendants. When the window is minimized we ask Windows to page out those
//! working sets; the pages fault back in on restore without changing app state.

#[cfg(target_os = "windows")]
mod imp {
    use std::collections::HashSet;
    use std::ffi::OsString;
    use std::mem::{size_of, zeroed};
    use std::os::windows::ffi::OsStringExt;
    use std::sync::{Mutex, OnceLock};
    use std::time::{Duration, Instant};

    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::ProcessStatus::{
        EmptyWorkingSet, GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS_EX,
    };
    use windows_sys::Win32::System::Threading::{
        GetCurrentProcess, OpenProcess, PROCESS_QUERY_INFORMATION,
        PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SET_QUOTA,
    };

    const MB: f64 = 1024.0 * 1024.0;
    static LAST_TRIM: OnceLock<Mutex<Option<Instant>>> = OnceLock::new();

    #[derive(Clone)]
    struct Proc {
        pid: u32,
        parent: u32,
        name: String,
    }

    #[derive(Default)]
    struct Stats {
        count: usize,
        working_set: usize,
        private: usize,
        top: Vec<(String, usize)>,
    }

    fn snapshot() -> Vec<Proc> {
        let mut processes = Vec::new();
        unsafe {
            let handle = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if handle == INVALID_HANDLE_VALUE || handle.is_null() {
                return processes;
            }
            let mut entry: PROCESSENTRY32W = zeroed();
            entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;
            let mut ok = Process32FirstW(handle, &mut entry);
            while ok != 0 {
                let name = OsString::from_wide(
                    &entry.szExeFile[..entry
                        .szExeFile
                        .iter()
                        .position(|value| *value == 0)
                        .unwrap_or(entry.szExeFile.len())],
                )
                .to_string_lossy()
                .into_owned();
                processes.push(Proc {
                    pid: entry.th32ProcessID,
                    parent: entry.th32ParentProcessID,
                    name,
                });
                ok = Process32NextW(handle, &mut entry);
            }
            CloseHandle(handle);
        }
        processes
    }

    fn descendants() -> Vec<Proc> {
        let current = std::process::id();
        let all = snapshot();
        let mut ids = HashSet::from([current]);
        let mut result = Vec::new();
        loop {
            let mut changed = false;
            for process in &all {
                if ids.contains(&process.pid) {
                    continue;
                }
                if ids.contains(&process.parent) {
                    ids.insert(process.pid);
                    result.push(process.clone());
                    changed = true;
                }
            }
            if !changed {
                break;
            }
        }
        result
    }

    fn process_memory(pid: u32) -> Option<(usize, usize)> {
        unsafe {
            let current = pid == std::process::id();
            let handle: HANDLE = if current {
                GetCurrentProcess()
            } else {
                let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
                if handle.is_null() {
                    return None;
                }
                handle
            };
            let mut counters: PROCESS_MEMORY_COUNTERS_EX = zeroed();
            counters.cb = size_of::<PROCESS_MEMORY_COUNTERS_EX>() as u32;
            let ok = GetProcessMemoryInfo(handle, &mut counters as *mut _ as *mut _, counters.cb);
            if !current {
                CloseHandle(handle);
            }
            if ok == 0 {
                None
            } else {
                Some((counters.WorkingSetSize, counters.PrivateUsage))
            }
        }
    }

    fn collect() -> Stats {
        let mut stats = Stats::default();
        if let Some((working_set, private)) = process_memory(std::process::id()) {
            stats.count += 1;
            stats.working_set += working_set;
            stats.private += private;
            stats
                .top
                .push(("Decro Desktop.exe".to_string(), working_set));
        }
        for process in descendants() {
            if let Some((working_set, private)) = process_memory(process.pid) {
                stats.count += 1;
                stats.working_set += working_set;
                stats.private += private;
                stats.top.push((process.name, working_set));
            }
        }
        stats.top.sort_by(|a, b| b.1.cmp(&a.1));
        stats.top.truncate(4);
        stats
    }

    fn summary(tag: &str) -> String {
        let stats = collect();
        let top = stats
            .top
            .iter()
            .map(|(name, bytes)| format!("{name}={:.1}MB", *bytes as f64 / MB))
            .collect::<Vec<_>>()
            .join(", ");
        format!(
            "{tag}: processes={} working={:.1}MB private={:.1}MB [{top}]",
            stats.count,
            stats.working_set as f64 / MB,
            stats.private as f64 / MB
        )
    }

    pub fn log_stats(tag: &str, level: &str) {
        crate::logger::log(level, "memory", &summary(tag));
    }

    pub fn trim_working_set(tag: &str, level: &str) {
        let lock = LAST_TRIM.get_or_init(|| Mutex::new(None));
        if let Ok(mut last) = lock.lock() {
            if last.is_some_and(|at| at.elapsed() < Duration::from_secs(8)) {
                return;
            }
            *last = Some(Instant::now());
        }

        log_stats(&format!("{tag}-before"), level);
        let current = std::process::id();
        unsafe {
            let current_handle = GetCurrentProcess();
            let _ = EmptyWorkingSet(current_handle);
        }
        for process in descendants() {
            if process.pid == current {
                continue;
            }
            unsafe {
                let handle = OpenProcess(
                    PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA,
                    0,
                    process.pid,
                );
                if handle.is_null() {
                    continue;
                }
                let _ = EmptyWorkingSet(handle);
                CloseHandle(handle);
            }
        }
        log_stats(&format!("{tag}-after"), level);
    }
}

#[cfg(target_os = "windows")]
pub use imp::{log_stats, trim_working_set};

#[cfg(not(target_os = "windows"))]
pub fn log_stats(_tag: &str, _level: &str) {}

#[cfg(not(target_os = "windows"))]
pub fn trim_working_set(_tag: &str, _level: &str) {}

#[cfg(target_os = "windows")]
pub fn set_webview_suspended(window: &tauri::WebviewWindow, suspended: bool) {
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_3;
    use windows_core::Interface;

    let _ = window.with_webview(move |webview| {
        let controller = webview.controller();
        let core = unsafe { controller.CoreWebView2() };
        let Ok(core) = core else { return };
        let Ok(core3) = core.cast::<ICoreWebView2_3>() else {
            return;
        };
        unsafe {
            if suspended {
                let _ = core3.TrySuspend(None);
            } else {
                let _ = core3.Resume();
            }
        }
    });
}

#[cfg(not(target_os = "windows"))]
pub fn set_webview_suspended(_window: &tauri::WebviewWindow, _suspended: bool) {}
