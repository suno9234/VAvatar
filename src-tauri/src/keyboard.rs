use rdev::{listen, Event, EventType, Key};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedKeyEvent {
    pub key_code: String,
    pub event_type: String, // "keydown" | "keyup"
    pub timestamp: u64,     // Unix ms
}

fn key_to_code(key: &Key) -> String {
    match key {
        Key::KeyA => "KeyA", Key::KeyB => "KeyB", Key::KeyC => "KeyC",
        Key::KeyD => "KeyD", Key::KeyE => "KeyE", Key::KeyF => "KeyF",
        Key::KeyG => "KeyG", Key::KeyH => "KeyH", Key::KeyI => "KeyI",
        Key::KeyJ => "KeyJ", Key::KeyK => "KeyK", Key::KeyL => "KeyL",
        Key::KeyM => "KeyM", Key::KeyN => "KeyN", Key::KeyO => "KeyO",
        Key::KeyP => "KeyP", Key::KeyQ => "KeyQ", Key::KeyR => "KeyR",
        Key::KeyS => "KeyS", Key::KeyT => "KeyT", Key::KeyU => "KeyU",
        Key::KeyV => "KeyV", Key::KeyW => "KeyW", Key::KeyX => "KeyX",
        Key::KeyY => "KeyY", Key::KeyZ => "KeyZ",
        Key::Num0 => "Digit0", Key::Num1 => "Digit1", Key::Num2 => "Digit2",
        Key::Num3 => "Digit3", Key::Num4 => "Digit4", Key::Num5 => "Digit5",
        Key::Num6 => "Digit6", Key::Num7 => "Digit7", Key::Num8 => "Digit8",
        Key::Num9 => "Digit9",
        Key::Space => "Space",
        Key::Return => "Enter",
        Key::Backspace => "Backspace",
        Key::Tab => "Tab",
        Key::CapsLock => "CapsLock",
        Key::Escape => "Escape",
        Key::ShiftLeft => "ShiftLeft", Key::ShiftRight => "ShiftRight",
        Key::ControlLeft => "ControlLeft", Key::ControlRight => "ControlRight",
        Key::Alt => "AltLeft", Key::AltGr => "AltRight",
        Key::UpArrow => "ArrowUp", Key::DownArrow => "ArrowDown",
        Key::LeftArrow => "ArrowLeft", Key::RightArrow => "ArrowRight",
        Key::F1 => "F1", Key::F2 => "F2", Key::F3 => "F3", Key::F4 => "F4",
        Key::F5 => "F5", Key::F6 => "F6", Key::F7 => "F7", Key::F8 => "F8",
        Key::F9 => "F9", Key::F10 => "F10", Key::F11 => "F11", Key::F12 => "F12",
        Key::Unknown(n) => return format!("Unknown({n})"),
        _ => return format!("{key:?}"),
    }
    .to_string()
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub struct KeyboardManager {
    active: Arc<AtomicBool>,
}

impl KeyboardManager {
    pub fn new() -> Self {
        Self {
            active: Arc::new(AtomicBool::new(false)),
        }
    }

    /// 글로벌 키보드 훅 시작. 콜백으로 이벤트 전달.
    pub fn start<F>(&self, on_event: F) -> Result<(), String>
    where
        F: Fn(NormalizedKeyEvent) + Send + 'static,
    {
        if self.active.load(Ordering::SeqCst) {
            return Ok(());
        }

        let active = Arc::clone(&self.active);
        active.store(true, Ordering::SeqCst);

        thread::spawn(move || {
            let result = listen(move |event: Event| {
                if !active.load(Ordering::SeqCst) {
                    return;
                }
                let normalized = match event.event_type {
                    EventType::KeyPress(key) => NormalizedKeyEvent {
                        key_code: key_to_code(&key),
                        event_type: "keydown".to_string(),
                        timestamp: now_ms(),
                    },
                    EventType::KeyRelease(key) => NormalizedKeyEvent {
                        key_code: key_to_code(&key),
                        event_type: "keyup".to_string(),
                        timestamp: now_ms(),
                    },
                    _ => return,
                };
                on_event(normalized);
            });

            if let Err(e) = result {
                log::error!("글로벌 키보드 훅 오류: {e:?}");
            }
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
