use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatLayout {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardLayout {
    pub x: f64,
    pub y: f64,
    pub rotation: f64,
}

fn default_cat_layout() -> CatLayout { CatLayout { x: 0.0, y: 0.0 } }
fn default_keyboard_layout() -> KeyboardLayout { KeyboardLayout { x: 0.25, y: 0.58, rotation: 0.0 } }
fn default_overlay_width() -> u32 { 400 }
fn default_overlay_height() -> u32 { 400 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub hook_enabled: bool,
    pub animation_intensity: f32,
    pub model_path: String,
    pub idle_timeout_ms: u64,
    pub interpolation_duration_ms: u64,
    #[serde(default = "default_cat_layout")]
    pub cat_layout: CatLayout,
    #[serde(default = "default_keyboard_layout")]
    pub keyboard_layout: KeyboardLayout,
    #[serde(default)]
    pub overlay_x: Option<i32>,
    #[serde(default)]
    pub overlay_y: Option<i32>,
    #[serde(default = "default_overlay_width")]
    pub overlay_width: u32,
    #[serde(default = "default_overlay_height")]
    pub overlay_height: u32,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            hook_enabled: true,
            animation_intensity: 0.8,
            model_path: "models/avatar.model3.json".to_string(),
            idle_timeout_ms: 150,
            interpolation_duration_ms: 80,
            cat_layout: default_cat_layout(),
            keyboard_layout: default_keyboard_layout(),
            overlay_x: None,
            overlay_y: None,
            overlay_width: default_overlay_width(),
            overlay_height: default_overlay_height(),
        }
    }
}

pub struct ConfigReader;

impl ConfigReader {
    pub fn config_path() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("avatar")
            .join("config.toml")
    }

    pub fn load_or_default() -> AppConfig {
        let path = Self::config_path();
        match fs::read_to_string(&path) {
            Ok(content) => match toml::from_str::<AppConfig>(&content) {
                Ok(config) => config,
                Err(e) => {
                    log::error!("config.toml 파싱 오류 ({path:?}): {e}. 기본값 사용.");
                    AppConfig::default()
                }
            },
            Err(e) => {
                log::warn!("config.toml 읽기 실패: {e}. 기본값 사용.");
                AppConfig::default()
            }
        }
    }

    pub fn save(config: &AppConfig) -> Result<(), String> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let content = toml::to_string(config).map_err(|e| e.to_string())?;
        fs::write(&path, content).map_err(|e| e.to_string())
    }
}
