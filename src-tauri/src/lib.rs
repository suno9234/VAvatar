mod commands;
mod config;
mod emitter;
mod filter;
mod keyboard;     // NormalizedKeyEvent 정의 보존 (filter/emitter에서 참조)
mod keyboard_raw; // Raw Input 구현 (IME 훅 체인 미간섭)

use config::ConfigReader;
use emitter::TauriEmitter;
use filter::EventFilter;
use keyboard_raw::KeyboardManager;
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};

pub struct AppState {
    pub config: Mutex<config::AppConfig>,
    pub keyboard: Arc<KeyboardManager>,
    pub filter: Arc<EventFilter>,
    pub emitter: Arc<TauriEmitter>,
}

fn open_settings_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(
            app,
            "settings",
            WebviewUrl::App("index.html".into()),
        )
        .title("Avatar 설정")
        .inner_size(900.0, 660.0)
        .resizable(true)
        .build();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = ConfigReader::load_or_default();
    let keyboard = Arc::new(KeyboardManager::new());
    let filter = Arc::new(EventFilter::new());
    let emitter = Arc::new(TauriEmitter::new());

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
            let state = app.state::<AppState>();
            state.emitter.set_app(app.handle().clone());

            let settings_item =
                MenuItem::with_id(app, "settings", "설정 열기", true, None::<&str>)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "settings" => open_settings_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::frontend_ready,
            commands::get_config,
            commands::save_config,
            commands::set_hook_enabled,
            commands::set_sensitive_mode,
            commands::apply_overlay_no_activate,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
