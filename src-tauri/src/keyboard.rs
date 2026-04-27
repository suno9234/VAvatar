use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedKeyEvent {
    pub key_code: String,
    pub event_type: String, // "keydown" | "keyup"
    pub timestamp: u64,     // Unix ms
}
