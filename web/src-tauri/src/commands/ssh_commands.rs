use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::collections::HashMap;
use std::io::Read;
use std::net::TcpStream;
use std::path::Path;
use std::sync::Mutex;
use tauri::State;

pub struct SshState {
    pub sessions: Mutex<HashMap<String, Session>>,
}

impl Default for SshState {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Serialize)]
pub struct RemoteEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Serialize, Deserialize)]
pub struct SshTunnelInfo {
    pub id: String,
    pub connection_id: String,
    pub local_port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    pub active: bool,
}

#[tauri::command]
pub fn ssh_connect(
    state: State<'_, SshState>,
    id: String,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    key_path: Option<String>,
) -> Result<(), String> {
    let tcp = TcpStream::connect(format!("{}:{}", host, port))
        .map_err(|e| format!("Connection failed: {}", e))?;

    let mut sess = Session::new().map_err(|e| format!("Session creation failed: {}", e))?;
    sess.set_tcp_stream(tcp);
    sess.handshake()
        .map_err(|e| format!("Handshake failed: {}", e))?;

    if let Some(key) = key_path {
        let key_path = if key.starts_with('~') {
            dirs::home_dir()
                .map(|h| h.join(&key[2..]))
                .unwrap_or_else(|| Path::new(&key).to_path_buf())
        } else {
            Path::new(&key).to_path_buf()
        };
        sess.userauth_pubkey_file(&username, None, &key_path, None)
            .map_err(|e| format!("Key auth failed: {}", e))?;
    } else if let Some(pw) = password {
        sess.userauth_password(&username, &pw)
            .map_err(|e| format!("Password auth failed: {}", e))?;
    } else {
        // Try agent
        sess.userauth_agent(&username)
            .map_err(|e| format!("Agent auth failed: {}", e))?;
    }

    if !sess.authenticated() {
        return Err("Authentication failed".to_string());
    }

    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    sessions.insert(id, sess);
    Ok(())
}

#[tauri::command]
pub fn ssh_disconnect(state: State<'_, SshState>, id: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(sess) = sessions.remove(&id) {
        let _ = sess.disconnect(None, "Disconnected by user", None);
    }
    Ok(())
}

#[tauri::command]
pub fn ssh_list_directory(
    state: State<'_, SshState>,
    id: String,
    path: String,
) -> Result<Vec<RemoteEntry>, String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let sess = sessions.get(&id).ok_or("Not connected")?;

    let sftp = sess.sftp().map_err(|e| format!("SFTP error: {}", e))?;
    let entries = sftp
        .readdir(Path::new(&path))
        .map_err(|e| format!("Read dir error: {}", e))?;

    let mut result: Vec<RemoteEntry> = entries
        .into_iter()
        .map(|(p, stat)| {
            let name = p
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let full_path = p.to_string_lossy().to_string();
            RemoteEntry {
                name,
                path: full_path,
                is_dir: stat.is_dir(),
                size: stat.size.unwrap_or(0),
            }
        })
        .filter(|e| !e.name.starts_with('.'))
        .collect();

    result.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(result)
}

#[tauri::command]
pub fn ssh_read_file(
    state: State<'_, SshState>,
    id: String,
    path: String,
) -> Result<String, String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let sess = sessions.get(&id).ok_or("Not connected")?;

    let sftp = sess.sftp().map_err(|e| format!("SFTP error: {}", e))?;
    let mut file = sftp
        .open(Path::new(&path))
        .map_err(|e| format!("Open error: {}", e))?;

    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Read error: {}", e))?;

    Ok(contents)
}

#[tauri::command]
pub fn ssh_write_file(
    state: State<'_, SshState>,
    id: String,
    path: String,
    content: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let sess = sessions.get(&id).ok_or("Not connected")?;

    let sftp = sess.sftp().map_err(|e| format!("SFTP error: {}", e))?;
    let mut file = sftp
        .create(Path::new(&path))
        .map_err(|e| format!("Create error: {}", e))?;

    use std::io::Write;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Write error: {}", e))?;

    Ok(())
}

// SSH connection config persistence
#[tauri::command]
pub fn load_ssh_connections() -> Result<String, String> {
    let path = dirs::home_dir()
        .ok_or("No home dir")?
        .join(".folio")
        .join("ssh-connections.json");

    if path.exists() {
        std::fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok("[]".to_string())
    }
}

#[tauri::command]
pub fn save_ssh_connections(data: String) -> Result<(), String> {
    let dir = dirs::home_dir()
        .ok_or("No home dir")?
        .join(".folio");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("ssh-connections.json"), data).map_err(|e| e.to_string())
}

// Tunnel stubs (tunnels require background threads; simplified for now)
#[tauri::command]
pub fn ssh_open_tunnel(
    _connection_id: String,
    _local_port: u16,
    _remote_host: String,
    _remote_port: u16,
) -> Result<String, String> {
    Err("SSH tunnels require a background thread. Use the terminal: ssh -L <local_port>:<remote_host>:<remote_port> user@host".to_string())
}

#[tauri::command]
pub fn ssh_close_tunnel(_id: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn ssh_list_tunnels() -> Result<Vec<SshTunnelInfo>, String> {
    Ok(vec![])
}
