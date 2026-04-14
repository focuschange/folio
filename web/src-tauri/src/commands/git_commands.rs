use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct GitStatusEntry {
    pub status: String,
    pub path: String,
}

#[derive(Serialize)]
pub struct DiffHunk {
    pub file_path: String,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub content: String,
}

#[derive(Serialize)]
pub struct GitLogEntry {
    pub hash: String,
    pub message: String,
}

fn run_git(args: &[&str], cwd: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!("Git error: {}", stderr))
    }
}

#[tauri::command]
pub fn is_git_repo(path: String) -> Result<bool, String> {
    let output = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub fn git_status(path: String) -> Result<Vec<GitStatusEntry>, String> {
    let output = run_git(&["status", "--porcelain"], &path)?;

    let entries = output
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| {
            let status = line.get(0..2).unwrap_or("??").trim().to_string();
            let file_path = line.get(3..).unwrap_or("").to_string();
            GitStatusEntry {
                status,
                path: file_path,
            }
        })
        .collect();

    Ok(entries)
}

#[tauri::command]
pub fn git_diff(path: String, file_path: Option<String>) -> Result<Vec<DiffHunk>, String> {
    let mut args = vec!["diff", "--unified=0"];
    let fp;
    if let Some(ref f) = file_path {
        args.push("--");
        fp = f.clone();
        args.push(&fp);
    }

    let output = run_git(&args, &path)?;
    let hunks = parse_diff_output(&output);
    Ok(hunks)
}

fn parse_diff_output(output: &str) -> Vec<DiffHunk> {
    let mut hunks = Vec::new();
    let mut current_file = String::new();

    for line in output.lines() {
        if line.starts_with("diff --git") {
            // Extract file path from "diff --git a/path b/path"
            if let Some(b_path) = line.split(" b/").last() {
                current_file = b_path.to_string();
            }
        } else if line.starts_with("@@") {
            // Parse hunk header: @@ -old_start,old_lines +new_start,new_lines @@
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                let (old_start, old_lines) = parse_hunk_range(parts[1]);
                let (new_start, new_lines) = parse_hunk_range(parts[2]);

                // Collect hunk content (lines after the @@ header until next @@ or diff)
                hunks.push(DiffHunk {
                    file_path: current_file.clone(),
                    old_start,
                    old_lines,
                    new_start,
                    new_lines,
                    content: String::new(),
                });
            }
        } else if line.starts_with('+') || line.starts_with('-') || line.starts_with(' ') {
            // Skip +++ and --- file headers
            if line.starts_with("+++") || line.starts_with("---") {
                continue;
            }
            if let Some(hunk) = hunks.last_mut() {
                if !hunk.content.is_empty() {
                    hunk.content.push('\n');
                }
                hunk.content.push_str(line);
            }
        }
    }

    hunks
}

fn parse_hunk_range(s: &str) -> (u32, u32) {
    // s is like "-10,3" or "+10,3" or "-10" or "+10"
    let s = s.trim_start_matches(|c| c == '-' || c == '+');
    let parts: Vec<&str> = s.split(',').collect();
    let start = parts[0].parse::<u32>().unwrap_or(0);
    let lines = if parts.len() > 1 {
        parts[1].parse::<u32>().unwrap_or(1)
    } else {
        1
    };
    (start, lines)
}

#[tauri::command]
pub fn git_add(path: String, files: Vec<String>) -> Result<String, String> {
    let mut args = vec!["add"];
    let files_ref: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(files_ref);
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<String, String> {
    run_git(&["commit", "-m", &message], &path)
}

#[tauri::command]
pub fn git_push(path: String) -> Result<String, String> {
    run_git(&["push"], &path)
}

#[tauri::command]
pub fn git_pull(path: String) -> Result<String, String> {
    run_git(&["pull"], &path)
}

#[tauri::command]
pub fn git_log(path: String, count: Option<u32>) -> Result<Vec<GitLogEntry>, String> {
    let count_str = format!("-{}", count.unwrap_or(50));
    let output = run_git(&["log", "--oneline", &count_str], &path)?;

    let entries = output
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| {
            let (hash, message) = line.split_once(' ').unwrap_or((line, ""));
            GitLogEntry {
                hash: hash.to_string(),
                message: message.to_string(),
            }
        })
        .collect();

    Ok(entries)
}

#[tauri::command]
pub fn git_branch(path: String) -> Result<String, String> {
    run_git(&["rev-parse", "--abbrev-ref", "HEAD"], &path)
}
