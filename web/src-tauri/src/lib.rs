mod commands;

use commands::{file_commands, git_commands, settings_commands, terminal_commands};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // File commands
            file_commands::read_file,
            file_commands::write_file,
            file_commands::list_directory,
            file_commands::get_file_info,
            file_commands::rename_file,
            file_commands::delete_file,
            file_commands::create_file,
            file_commands::create_directory,
            file_commands::search_in_files,
            file_commands::open_folder_dialog,
            // Git commands
            git_commands::git_status,
            git_commands::git_diff,
            git_commands::git_add,
            git_commands::git_commit,
            git_commands::git_push,
            git_commands::git_pull,
            git_commands::git_log,
            git_commands::git_branch,
            git_commands::is_git_repo,
            // Settings commands
            settings_commands::load_settings,
            settings_commands::save_settings,
            // Terminal commands
            terminal_commands::run_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
