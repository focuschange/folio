use std::fs;
use std::path::PathBuf;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

fn settings_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Cannot determine home directory".to_string())?;
    Ok(home.join(".folio").join("settings.json"))
}

/// Restrict a file to owner-only read/write (0600) and its parent directory to 0700.
#[cfg(unix)]
fn harden_permissions(path: &std::path::Path) {
    let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
    if let Some(parent) = path.parent() {
        let _ = fs::set_permissions(parent, fs::Permissions::from_mode(0o700));
    }
}

#[cfg(not(unix))]
fn harden_permissions(_path: &std::path::Path) {}

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
    fs::write(&path, settings_json).map_err(|e| format!("Failed to save settings: {}", e))?;
    harden_permissions(&path);
    Ok(())
}

#[tauri::command]
pub fn save_session(session_json: String) -> Result<(), String> {
    let dir = dirs::home_dir()
        .ok_or_else(|| "Cannot determine home directory".to_string())?
        .join(".folio");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create session directory: {}", e))?;
    let path = dir.join("session.json");
    fs::write(&path, session_json)
        .map_err(|e| format!("Failed to save session: {}", e))?;
    harden_permissions(&path);
    Ok(())
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
