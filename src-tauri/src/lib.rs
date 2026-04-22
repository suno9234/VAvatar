mod commands;
mod config;
mod emitter;
mod filter;
mod keyboard;

use config::{AppConfig, ConfigReader};
use emitter::TauriEmitter;
use filter::EventFilter;
use keyboard::KeyboardManager;
use std::sync::{Arc, Mutex};
use tauri::Manager;

pub struct AppState {
    pub config: Mutex<AppConfig>,
    pub keyboard: Arc<KeyboardManager>,
    pub filter: Arc<EventFilter>,
    pub emitter: Arc<TauriEmitter>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = ConfigReader::load_or_default();
    let keyboard = Arc::new(KeyboardManager::new());
    let filter = Arc::new(EventFilter::new());
    let emitter = Arc::new(TauriEmitter::new());

    // 키보드 훅 → 필터 → IPC 파이프라인
    if config.hook_enabled {
        let filter_clone = Arc::clone(&filter);
        let emitter_clone = Arc::clone(&emitter);

        if let Err(e) = keyboard.start(move |event| {
            if let Some(filtered) = filter_clone.process(event) {
                emitter_clone.send(filtered);
            }
        }) {
            log::error!("키보드 훅 시작 실패: {e}");
        }
    }

    let state = AppState {
        config: Mutex::new(config),
        keyboard,
        filter,
        emitter,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .setup(|app| {
            // AppHandle을 emitter에 등록
            let state = app.state::<AppState>();
            state.emitter.set_app(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::frontend_ready,
            commands::get_config,
            commands::save_config,
            commands::set_hook_enabled,
            commands::set_sensitive_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
