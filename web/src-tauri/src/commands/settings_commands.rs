use std::fs;
use std::path::PathBuf;

fn settings_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Cannot determine home directory".to_string())?;
    Ok(home.join(".folio").join("settings.json"))
}

#[tauri::command]
pub fn load_settings() -> Result<String, String> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| format!("Failed to read settings: {}", e))
}

#[tauri::command]
pub fn save_settings(settings_json: String) -> Result<(), String> {
    let path = settings_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    fs::write(&path, settings_json).map_err(|e| format!("Failed to save settings: {}", e))
}

#[tauri::command]
pub fn save_session(session_json: String) -> Result<(), String> {
    let dir = dirs::home_dir()
        .ok_or_else(|| "Cannot determine home directory".to_string())?
        .join(".folio");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create session directory: {}", e))?;
    fs::write(dir.join("session.json"), session_json)
        .map_err(|e| format!("Failed to save session: {}", e))
}

#[tauri::command]
pub fn load_session() -> Result<String, String> {
    let path = dirs::home_dir()
        .ok_or_else(|| "Cannot determine home directory".to_string())?
        .join(".folio")
        .join("session.json");
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| format!("Failed to read session: {}", e))
    } else {
        Ok("{}".to_string())
    }
}
