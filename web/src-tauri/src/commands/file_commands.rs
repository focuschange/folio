use serde::Serialize;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Serialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created: u64,
    pub modified: u64,
    pub is_dir: bool,
    pub is_file: bool,
    pub readonly: bool,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub path: String,
    pub line_number: usize,
    pub line_content: String,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Try UTF-8 first
    if let Ok(content) = String::from_utf8(bytes.clone()) {
        return Ok(content);
    }

    // Fallback: lossy UTF-8 conversion
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

#[tauri::command]
pub fn write_file(path: String, content: String, _encoding: Option<String>) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::write(&path, content.as_bytes()).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    list_dir_recursive(&path, 0)
}

fn list_dir_recursive(path: &str, depth: usize) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;
    let max_depth = 8;

    let mut result: Vec<FileEntry> = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let name = entry.file_name().to_string_lossy().into_owned();

        // Skip hidden files and common excludes
        if name.starts_with('.') || name == "node_modules" || name == "target"
            || name == "build" || name == "dist" || name == "__pycache__"
        {
            continue;
        }

        let metadata = entry.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;
        let modified = metadata.modified().ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let entry_path = entry.path().to_string_lossy().into_owned();
        let is_dir = metadata.is_dir();

        let children = if is_dir && depth < max_depth {
            match list_dir_recursive(&entry_path, depth + 1) {
                Ok(c) => Some(c),
                Err(_) => Some(vec![]),
            }
        } else if is_dir {
            Some(vec![])
        } else {
            None
        };

        result.push(FileEntry {
            name,
            path: entry_path,
            is_dir,
            size: metadata.len(),
            modified,
            children,
        });
    }

    // Sort: directories first, then alphabetically
    result.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(result)
}

#[tauri::command]
pub fn get_file_info(path: String) -> Result<FileInfo, String> {
    let p = Path::new(&path);
    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to get file info: {}", e))?;

    let created = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let readonly = metadata.permissions().readonly();

    Ok(FileInfo {
        name: p
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default(),
        path: path.clone(),
        size: metadata.len(),
        created,
        modified,
        is_dir: metadata.is_dir(),
        is_file: metadata.is_file(),
        readonly,
    })
}

#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename: {}", e))
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }
    fs::write(&path, "").map_err(|e| format!("Failed to create file: {}", e))
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

const SKIP_DIRS: &[&str] = &[".git", "node_modules", "build", "target", "dist", ".next"];
const MAX_RESULTS: usize = 1000;

#[tauri::command]
pub fn search_in_files(
    root: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
) -> Result<Vec<SearchResult>, String> {
    let mut results: Vec<SearchResult> = Vec::new();

    let regex = if use_regex {
        let pattern = if case_sensitive {
            regex::Regex::new(&query)
        } else {
            regex::RegexBuilder::new(&query)
                .case_insensitive(true)
                .build()
        };
        Some(pattern.map_err(|e| format!("Invalid regex: {}", e))?)
    } else {
        None
    };

    let query_lower = if !case_sensitive && !use_regex {
        query.to_lowercase()
    } else {
        query.clone()
    };

    search_recursive(
        Path::new(&root),
        &query,
        &query_lower,
        case_sensitive,
        &regex,
        &mut results,
    );

    Ok(results)
}

fn search_recursive(
    dir: &Path,
    query: &str,
    query_lower: &str,
    case_sensitive: bool,
    regex: &Option<regex::Regex>,
    results: &mut Vec<SearchResult>,
) {
    if results.len() >= MAX_RESULTS {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries {
        if results.len() >= MAX_RESULTS {
            return;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();
        let file_name = entry.file_name();
        let name = file_name.to_string_lossy();

        if path.is_dir() {
            if SKIP_DIRS.contains(&name.as_ref()) {
                continue;
            }
            search_recursive(&path, query, query_lower, case_sensitive, regex, results);
        } else if path.is_file() {
            // Skip binary files by checking extension
            let content = match fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            for (i, line) in content.lines().enumerate() {
                if results.len() >= MAX_RESULTS {
                    return;
                }

                let matched = if let Some(ref re) = regex {
                    re.is_match(line)
                } else if case_sensitive {
                    line.contains(query)
                } else {
                    line.to_lowercase().contains(query_lower)
                };

                if matched {
                    results.push(SearchResult {
                        path: path.to_string_lossy().into_owned(),
                        line_number: i + 1,
                        line_content: line.to_string(),
                    });
                }
            }
        }
    }
}

#[tauri::command]
pub async fn open_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_title("Open Folder")
        .pick_folder(move |folder_path| {
            let _ = tx.send(folder_path.map(|p| format!("{}", p)));
        });
    rx.await.map_err(|e| format!("Dialog cancelled: {}", e))
}
