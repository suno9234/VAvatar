mod commands;
mod config;
mod emitter;
mod filter;
mod keyboard;     // NormalizedKeyEvent 정의 보존 (filter/emitter에서 참조)
mod keyboard_raw; // Raw Input 구현 (IME 훅 체인 미간섭)

// 오버레이 창 가로세로 비율 고정 (WM_SIZING 가로채기)
#[cfg(target_os = "windows")]
mod aspect_lock {
    use std::sync::atomic::{AtomicBool, Ordering};
    use windows_sys::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        WM_SIZING, WMSZ_BOTTOM, WMSZ_LEFT, WMSZ_RIGHT, WMSZ_TOP,
    };

    // SetWindowSubclass / DefSubclassProc — windows-sys에 미포함이므로 comctl32 직접 링크
    #[link(name = "comctl32")]
    extern "system" {
        fn SetWindowSubclass(
            hwnd: HWND,
            pfnsubclass: unsafe extern "system" fn(HWND, u32, WPARAM, LPARAM, usize, usize) -> LRESULT,
            uidsubclass: usize,
            dwrefdata: usize,
        ) -> i32;

        fn DefSubclassProc(hwnd: HWND, umsg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT;
    }

    use std::sync::atomic::AtomicU64;

    // 편집 모드(설정창 열림)일 때 비율 고정 해제
    pub static EDIT_MODE: AtomicBool = AtomicBool::new(false);
    // 저장된 비율 (height / width), f64 비트로 보관
    static ASPECT_BITS: AtomicU64 = AtomicU64::new(0);

    pub fn set_edit_mode(enabled: bool) {
        EDIT_MODE.store(enabled, Ordering::SeqCst);
    }

    pub fn set_aspect(ratio: f64) {
        ASPECT_BITS.store(ratio.to_bits(), Ordering::SeqCst);
    }

    unsafe extern "system" fn subclass_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _uid: usize,
        _data: usize,
    ) -> LRESULT {
        use windows_sys::Win32::UI::WindowsAndMessaging::{WM_NCHITTEST, GetWindowRect};
        use windows_sys::Win32::Foundation::RECT;

        if msg == WM_NCHITTEST {
            if !EDIT_MODE.load(Ordering::SeqCst) {
                return -1; // HTTRANSPARENT
            }
            // 편집 모드: 창 테두리 8px 영역은 리사이즈/이동 처리
            const HTCLIENT: LRESULT     = 1;
            const HTTOP: LRESULT        = 12;
            const HTTOPLEFT: LRESULT    = 13;
            const HTTOPRIGHT: LRESULT   = 14;
            const HTBOTTOM: LRESULT     = 15;
            const HTBOTTOMLEFT: LRESULT = 16;
            const HTBOTTOMRIGHT: LRESULT= 17;
            const HTLEFT: LRESULT       = 10;
            const HTRIGHT: LRESULT      = 11;
            const BORDER: i32 = 8;

            let cx = (lparam & 0xFFFF) as i16 as i32;
            let cy = ((lparam >> 16) & 0xFFFF) as i16 as i32;
            let mut r = RECT { left: 0, right: 0, top: 0, bottom: 0 };
            GetWindowRect(hwnd, &mut r);

            let on_l = cx < r.left + BORDER;
            let on_r = cx >= r.right - BORDER;
            let on_t = cy < r.top + BORDER;
            let on_b = cy >= r.bottom - BORDER;

            return match (on_t, on_b, on_l, on_r) {
                (true,  _,     true,  _    ) => HTTOPLEFT,
                (true,  _,     _,     true ) => HTTOPRIGHT,
                (_,     true,  true,  _    ) => HTBOTTOMLEFT,
                (_,     true,  _,     true ) => HTBOTTOMRIGHT,
                (true,  _,     _,     _    ) => HTTOP,
                (_,     true,  _,     _    ) => HTBOTTOM,
                (_,     _,     true,  _    ) => HTLEFT,
                (_,     _,     _,     true ) => HTRIGHT,
                _                            => HTCLIENT,
            };
        }
        if msg == WM_SIZING && !EDIT_MODE.load(Ordering::SeqCst) {
            let aspect = f64::from_bits(ASPECT_BITS.load(Ordering::SeqCst));
            if aspect > 0.0 {
                let rect = &mut *(lparam as *mut RECT);
                let w = (rect.right - rect.left) as f64;
                let h = (rect.bottom - rect.top) as f64;
                match wparam as u32 {
                    WMSZ_LEFT | WMSZ_RIGHT => {
                        rect.bottom = rect.top + (w * aspect).round() as i32;
                    }
                    WMSZ_TOP | WMSZ_BOTTOM => {
                        rect.right = rect.left + (h / aspect).round() as i32;
                    }
                    _ => {
                        rect.bottom = rect.top + (w * aspect).round() as i32;
                    }
                }
                return 1;
            }
        }
        DefSubclassProc(hwnd, msg, wparam, lparam)
    }

    pub fn attach(hwnd: HWND, initial_aspect: f64) {
        ASPECT_BITS.store(initial_aspect.to_bits(), Ordering::SeqCst);
        unsafe {
            SetWindowSubclass(hwnd, subclass_proc, 1, 0);
        }
    }
}

use config::ConfigReader;
use emitter::TauriEmitter;
use filter::EventFilter;
use keyboard_raw::KeyboardManager;
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};

#[cfg(target_os = "windows")]
fn ensure_topmost(hwnd: windows_sys::Win32::Foundation::HWND) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, HWND_TOPMOST,
    };
    unsafe {
        SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
    }
}

#[cfg(target_os = "windows")]
fn set_click_through(hwnd: windows_sys::Win32::Foundation::HWND, enabled: bool) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW, GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT,
    };
    unsafe {
        let style = GetWindowLongW(hwnd, GWL_EXSTYLE);
        let new_style = if enabled {
            style | WS_EX_LAYERED as i32 | WS_EX_TRANSPARENT as i32
        } else {
            style & !(WS_EX_TRANSPARENT as i32)
        };
        SetWindowLongW(hwnd, GWL_EXSTYLE, new_style);
    }
}

pub struct AppState {
    pub config: Mutex<config::AppConfig>,
    pub keyboard: Arc<KeyboardManager>,
    pub filter: Arc<EventFilter>,
    pub emitter: Arc<TauriEmitter>,
}

fn open_settings_window(app: &AppHandle) {
    // 이미 열려 있으면 포커스만
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }

    match WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("Avatar 설정")
        .inner_size(900.0, 660.0)
        .resizable(true)
        .build()
    {
        Ok(win) => {
            // 설정창 열림 → 오버레이 편집 모드 ON + 클릭통과 해제
            if let Some(overlay) = app.get_webview_window("overlay") {
                #[cfg(target_os = "windows")]
                if let Ok(hwnd) = overlay.hwnd() {
                    set_click_through(hwnd.0, false);
                }
                let _ = overlay.emit("settings-mode", true);
            }
            #[cfg(target_os = "windows")]
            aspect_lock::set_edit_mode(true);

            let app_clone = app.clone();
            win.on_window_event(move |event| {
                if matches!(event, tauri::WindowEvent::Destroyed) {
                    // 설정창 닫힘 → 창 위치/크기 + 레이아웃 저장, 편집 모드 OFF
                    if let Some(overlay) = app_clone.get_webview_window("overlay") {
                        #[cfg(target_os = "windows")]
                        if let Ok(hwnd) = overlay.hwnd() {
                            set_click_through(hwnd.0, true);
                            ensure_topmost(hwnd.0);
                        }

                        // 창 위치/크기 저장
                        if let (Ok(pos), Ok(size)) = (overlay.outer_position(), overlay.inner_size()) {
                            if size.width > 0 {
                                #[cfg(target_os = "windows")]
                                aspect_lock::set_aspect(size.height as f64 / size.width as f64);

                                let state = app_clone.state::<AppState>();
                                let mut config = state.config.lock().unwrap();
                                config.overlay_x = Some(pos.x);
                                config.overlay_y = Some(pos.y);
                                config.overlay_width = size.width;
                                config.overlay_height = size.height;
                                let _ = ConfigReader::save(&config);
                            }
                        }

                        let _ = overlay.emit("settings-mode", false);
                    }
                    #[cfg(target_os = "windows")]
                    aspect_lock::set_edit_mode(false);
                }
            });
        }
        Err(e) => log::error!("설정창 열기 실패: {e}"),
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

            // 저장된 창 위치/크기 복원
            {
                let cfg = app.state::<AppState>().config.lock().unwrap().clone();
                if let Some(overlay) = app.get_webview_window("overlay") {
                    use tauri::{PhysicalPosition, PhysicalSize};
                    if let (Some(x), Some(y)) = (cfg.overlay_x, cfg.overlay_y) {
                        let _ = overlay.set_position(PhysicalPosition::new(x, y));
                    }
                    if cfg.overlay_width > 0 && cfg.overlay_height > 0 {
                        let _ = overlay.set_size(PhysicalSize::new(cfg.overlay_width, cfg.overlay_height));
                    }
                }
            }

            // 오버레이 창에 비율 고정 서브클래스 부착
            #[cfg(target_os = "windows")]
            if let Some(overlay) = app.get_webview_window("overlay") {
                if let Ok(hwnd) = overlay.hwnd() {
                    let initial_aspect = overlay.inner_size()
                        .map(|s| s.height as f64 / s.width as f64)
                        .unwrap_or(620.0 / 280.0);
                    aspect_lock::attach(hwnd.0, initial_aspect);

                    // 프레임을 클라이언트 영역 전체로 확장 — WebView2 inset 제거
                    use windows_sys::Win32::Graphics::Dwm::{DwmExtendFrameIntoClientArea, DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE};
                    use windows_sys::Win32::UI::Controls::MARGINS;
                    unsafe {
                        let margins = MARGINS { cxLeftWidth: -1, cxRightWidth: -1, cyTopHeight: -1, cyBottomHeight: -1 };
                        DwmExtendFrameIntoClientArea(hwnd.0, &margins);

                        // Windows 11 둥근 모서리 비활성화
                        let preference: u32 = 1; // DWMWCP_DONOTROUND
                        DwmSetWindowAttribute(
                            hwnd.0,
                            DWMWA_WINDOW_CORNER_PREFERENCE as u32,
                            &preference as *const u32 as *const _,
                            std::mem::size_of::<u32>() as u32,
                        );
                    }

                    // 초기 클릭통과 + 최상단 강제 적용
                    set_click_through(hwnd.0, true);
                    ensure_topmost(hwnd.0);
                }
            }

            // 마우스 이동 감지 폴링 스레드 — delta 방출 + 주기적 topmost 재적용
            {
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    let mut last_pos = get_cursor_pos();
                    let mut last_moved = std::time::Instant::now();
                    let mut is_moving = false;
                    let mut tick: u32 = 0;

                    loop {
                        let pos = get_cursor_pos();
                        let dx = pos.0 - last_pos.0;
                        let dy = pos.1 - last_pos.1;

                        if dx != 0 || dy != 0 {
                            last_pos = pos;
                            last_moved = std::time::Instant::now();
                            is_moving = true;
                            if let Some(overlay) = app_handle.get_webview_window("overlay") {
                                let _ = overlay.emit("mouse-delta", [dx, dy]);
                            }
                        } else if is_moving && last_moved.elapsed().as_millis() > 150 {
                            is_moving = false;
                            if let Some(overlay) = app_handle.get_webview_window("overlay") {
                                let _ = overlay.emit("mouse-stop", ());
                            }
                        }

                        // 약 2초마다 최상단 재적용 (편집 모드 제외)
                        tick = tick.wrapping_add(1);
                        #[cfg(target_os = "windows")]
                        if tick % 250 == 0 && !aspect_lock::EDIT_MODE.load(std::sync::atomic::Ordering::Relaxed) {
                            if let Some(overlay) = app_handle.get_webview_window("overlay") {
                                if let Ok(hwnd) = overlay.hwnd() {
                                    ensure_topmost(hwnd.0);
                                }
                            }
                        }

                        std::thread::sleep(std::time::Duration::from_millis(8));
                    }
                });
            }

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
            commands::get_layout,
            commands::save_layout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "windows")]
fn get_cursor_pos() -> (i32, i32) {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut pt = POINT { x: 0, y: 0 };
    unsafe { GetCursorPos(&mut pt); }
    (pt.x, pt.y)
}

#[cfg(not(target_os = "windows"))]
fn get_cursor_pos() -> (i32, i32) { (0, 0) }
