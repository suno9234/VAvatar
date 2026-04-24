// GetAsyncKeyState 폴링 방식 글로벌 키보드 입력
// WH_KEYBOARD_LL 미사용 → IME 훅 체인 완전 독립
// NormalizedKeyEvent는 기존 keyboard.rs에서 재사용

use crate::keyboard::NormalizedKeyEvent;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// 폴링할 (VK 코드, KeyboardEvent.code 문자열) 목록
static VK_MAP: &[(i32, &str)] = &[
    // 알파벳
    (0x41, "KeyA"), (0x42, "KeyB"), (0x43, "KeyC"), (0x44, "KeyD"),
    (0x45, "KeyE"), (0x46, "KeyF"), (0x47, "KeyG"), (0x48, "KeyH"),
    (0x49, "KeyI"), (0x4A, "KeyJ"), (0x4B, "KeyK"), (0x4C, "KeyL"),
    (0x4D, "KeyM"), (0x4E, "KeyN"), (0x4F, "KeyO"), (0x50, "KeyP"),
    (0x51, "KeyQ"), (0x52, "KeyR"), (0x53, "KeyS"), (0x54, "KeyT"),
    (0x55, "KeyU"), (0x56, "KeyV"), (0x57, "KeyW"), (0x58, "KeyX"),
    (0x59, "KeyY"), (0x5A, "KeyZ"),
    // 숫자
    (0x30, "Digit0"), (0x31, "Digit1"), (0x32, "Digit2"), (0x33, "Digit3"),
    (0x34, "Digit4"), (0x35, "Digit5"), (0x36, "Digit6"), (0x37, "Digit7"),
    (0x38, "Digit8"), (0x39, "Digit9"),
    // 기능 키
    (0x20, "Space"),
    (0x0D, "Enter"),
    (0x08, "Backspace"),
    (0x09, "Tab"),
    (0x14, "CapsLock"),
    (0x1B, "Escape"),
    // 수정 키 (좌/우 구분)
    (0xA0, "ShiftLeft"),    (0xA1, "ShiftRight"),
    (0xA2, "ControlLeft"),  (0xA3, "ControlRight"),
    (0xA4, "AltLeft"),      (0xA5, "AltRight"),
    (0x5B, "MetaLeft"),     (0x5C, "MetaRight"),
    // 방향키
    (0x25, "ArrowLeft"), (0x26, "ArrowUp"),
    (0x27, "ArrowRight"), (0x28, "ArrowDown"),
    // F 키
    (0x70, "F1"),  (0x71, "F2"),  (0x72, "F3"),  (0x73, "F4"),
    (0x74, "F5"),  (0x75, "F6"),  (0x76, "F7"),  (0x77, "F8"),
    (0x78, "F9"),  (0x79, "F10"), (0x7A, "F11"), (0x7B, "F12"),
    // 기타
    (0x2D, "Insert"),  (0x2E, "Delete"),
    (0x24, "Home"),    (0x23, "End"),
    (0x21, "PageUp"),  (0x22, "PageDown"),
];

pub struct KeyboardManager {
    active: Arc<AtomicBool>,
}

impl KeyboardManager {
    pub fn new() -> Self {
        Self {
            active: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn start<F>(&self, on_event: F) -> Result<(), String>
    where
        F: Fn(NormalizedKeyEvent) + Send + 'static,
    {
        if self.active.load(Ordering::SeqCst) {
            return Ok(());
        }
        let active = Arc::clone(&self.active);
        active.store(true, Ordering::SeqCst);

        std::thread::spawn(move || {
            // 직전 프레임 키 상태 (true = 눌림)
            let mut prev = [false; 256];

            eprintln!("[keyboard_raw] GetAsyncKeyState 폴링 시작");

            while active.load(Ordering::SeqCst) {
                for &(vk, code) in VK_MAP {
                    let down = is_key_down(vk);
                    let idx = vk as usize;
                    if down != prev[idx] {
                        prev[idx] = down;
                        let event = NormalizedKeyEvent {
                            key_code: code.to_string(),
                            event_type: if down { "keydown" } else { "keyup" }.into(),
                            timestamp: now_ms(),
                        };
                        on_event(event);
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(8));
            }

            eprintln!("[keyboard_raw] 폴링 종료");
        });

        Ok(())
    }

    pub fn stop(&self) {
        self.active.store(false, Ordering::SeqCst);
    }

    pub fn is_active(&self) -> bool {
        self.active.load(Ordering::SeqCst)
    }
}

#[cfg(target_os = "windows")]
fn is_key_down(vk: i32) -> bool {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;
    // 최상위 비트가 1이면 키가 눌려있음
    unsafe { GetAsyncKeyState(vk) < 0 }
}

#[cfg(not(target_os = "windows"))]
fn is_key_down(_vk: i32) -> bool {
    false
}
