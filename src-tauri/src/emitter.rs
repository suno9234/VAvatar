use crate::keyboard::NormalizedKeyEvent;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

const MAX_BUFFER: usize = 100;

pub struct TauriEmitter {
    app: Mutex<Option<AppHandle>>,
    pending: Mutex<Vec<NormalizedKeyEvent>>,
    ready: Mutex<bool>,
}

impl TauriEmitter {
    pub fn new() -> Self {
        Self {
            app: Mutex::new(None),
            pending: Mutex::new(Vec::new()),
            ready: Mutex::new(false),
        }
    }

    pub fn set_app(&self, app: AppHandle) {
        *self.app.lock().unwrap() = Some(app);
    }

    /// 프론트엔드 준비 완료 신호 수신 → 버퍼 flush
    pub fn on_frontend_ready(&self) {
        *self.ready.lock().unwrap() = true;
        let pending: Vec<_> = self.pending.lock().unwrap().drain(..).collect();
        for event in pending {
            self.emit(event);
        }
    }

    /// 이벤트 전송 (미준비 시 버퍼링)
    pub fn send(&self, event: NormalizedKeyEvent) {
        if *self.ready.lock().unwrap() {
            self.emit(event);
        } else {
            let mut buf = self.pending.lock().unwrap();
            if buf.len() < MAX_BUFFER {
                buf.push(event);
            } else {
                log::warn!("pending 버퍼 초과. 이벤트 폐기.");
            }
        }
    }

    fn emit(&self, event: NormalizedKeyEvent) {
        if let Some(app) = self.app.lock().unwrap().as_ref() {
            if let Err(e) = app.emit("keyboard-event", &event) {
                log::error!("IPC emit 실패: {e}");
            }
        }
    }
}
