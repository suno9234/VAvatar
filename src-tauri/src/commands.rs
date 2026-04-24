use crate::config::{AppConfig, ConfigReader};
use tauri::State;
use crate::AppState;

#[tauri::command]
pub fn frontend_ready(state: State<AppState>) {
    state.emitter.on_frontend_ready();
}

#[tauri::command]
pub fn get_config(state: State<AppState>) -> AppConfig {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
pub fn save_config(config: AppConfig, state: State<AppState>) -> Result<(), String> {
    ConfigReader::save(&config)?;
    *state.config.lock().unwrap() = config;
    Ok(())
}

#[tauri::command]
pub fn set_hook_enabled(enabled: bool, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.hook_enabled = enabled;
    if enabled {
        log::info!("키보드 훅 활성화");
    } else {
        state.keyboard.stop();
        log::info!("키보드 훅 비활성화");
    }
    Ok(())
}

#[tauri::command]
pub fn set_sensitive_mode(sensitive: bool, state: State<AppState>) {
    state.filter.set_sensitive_mode(sensitive);
}

/// 오버레이 창 + WebView2 자식 창 전체에 WS_EX_NOACTIVATE 적용
/// → 클릭해도 포커스를 절대 가져가지 않아 한영키 오작동 방지
#[tauri::command]
pub fn apply_overlay_no_activate(window: tauri::WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::{BOOL, HWND, LPARAM, TRUE};
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            EnumChildWindows, GetWindowLongW, SetWindowLongW, GWL_EXSTYLE, WS_EX_NOACTIVATE,
        };

        unsafe extern "system" fn set_noactivate(hwnd: HWND, _: LPARAM) -> BOOL {
            unsafe {
                let style = GetWindowLongW(hwnd, GWL_EXSTYLE);
                SetWindowLongW(hwnd, GWL_EXSTYLE, style | WS_EX_NOACTIVATE as i32);
            }
            TRUE
        }

        if let Ok(hwnd) = window.hwnd() {
            let root = hwnd.0 as HWND;
            unsafe {
                // 최상위 창
                let style = GetWindowLongW(root, GWL_EXSTYLE);
                SetWindowLongW(root, GWL_EXSTYLE, style | WS_EX_NOACTIVATE as i32);
                // WebView2 포함 모든 자식 창
                EnumChildWindows(root, Some(set_noactivate), 0);
            }
        }
    }
}
