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
