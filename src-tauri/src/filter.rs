use crate::keyboard::NormalizedKeyEvent;
use std::collections::VecDeque;
use std::sync::Mutex;

const MAX_QUEUE_SIZE: usize = 500;

pub struct EventFilter {
    queue: Mutex<VecDeque<NormalizedKeyEvent>>,
    sensitive_mode: Mutex<bool>,
}

impl EventFilter {
    pub fn new() -> Self {
        Self {
            queue: Mutex::new(VecDeque::with_capacity(MAX_QUEUE_SIZE)),
            sensitive_mode: Mutex::new(false),
        }
    }

    /// 민감 컨텍스트 모드 설정 (비밀번호 입력 등)
    pub fn set_sensitive_mode(&self, sensitive: bool) {
        *self.sensitive_mode.lock().unwrap() = sensitive;
    }

    /// 이벤트 필터링. None 반환 시 폐기.
    pub fn process(&self, mut event: NormalizedKeyEvent) -> Option<NormalizedKeyEvent> {
        // 민감 컨텍스트: key_code는 유지하되 내용 숨김
        if *self.sensitive_mode.lock().unwrap() {
            event.key_code = "REDACTED".to_string();
        }

        // 큐 오버플로 방지
        let mut queue = self.queue.lock().unwrap();
        if queue.len() >= MAX_QUEUE_SIZE {
            log::warn!("이벤트 큐 오버플로. 오래된 이벤트 폐기.");
            queue.pop_front();
        }
        queue.push_back(event.clone());

        Some(event)
    }
}
