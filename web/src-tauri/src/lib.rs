mod commands;

use commands::{ai_commands, file_commands, git_commands, settings_commands, ssh_commands, terminal_commands};
use tauri::{Emitter, Manager};
use tauri::menu::{Menu, Submenu, MenuItem, PredefinedMenuItem};

fn write_log(msg: &str) {
    if let Some(home) = dirs::home_dir() {
        let log_path = home.join(".folio").join("menu.log");
        if let Some(parent) = log_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let line = format!("[{}] {}\n",
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs()).unwrap_or(0),
            msg);
        use std::io::Write;
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
            let _ = f.write_all(line.as_bytes());
        }
    }
    eprintln!("{}", msg);
}

fn build_menu<R: tauri::Runtime, M: tauri::Manager<R>>(app: &M) -> tauri::Result<Menu<R>> {
    // App menu
    let app_menu = Submenu::with_items(
        app,
        "Folio",
        true,
        &[
            &PredefinedMenuItem::about(app, Some("About Folio"), None)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "settings", "Settings", true, Some("CmdOrCtrl+,"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, Some("Hide Folio"))?,
            &PredefinedMenuItem::hide_others(app, Some("Hide Others"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("Quit Folio"))?,
        ],
    )?;

    // File menu
    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(app, "new-file", "New File", true, Some("CmdOrCtrl+N"))?,
            &MenuItem::with_id(app, "open-file", "Open File", true, Some("CmdOrCtrl+O"))?,
            &MenuItem::with_id(app, "open-folder", "Open Folder", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?,
            &MenuItem::with_id(app, "save-as", "Save As...", true, Some("CmdOrCtrl+Shift+S"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "close-tab", "Close Tab", true, Some("CmdOrCtrl+W"))?,
        ],
    )?;

    // Edit menu
    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("Undo"))?,
            &PredefinedMenuItem::redo(app, Some("Redo"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some("Cut"))?,
            &PredefinedMenuItem::copy(app, Some("Copy"))?,
            &PredefinedMenuItem::paste(app, Some("Paste"))?,
            &PredefinedMenuItem::select_all(app, Some("Select All"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "find", "Find", true, Some("CmdOrCtrl+F"))?,
            &MenuItem::with_id(app, "find-in-project", "Find in Project", true, Some("CmdOrCtrl+Shift+F"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "format-document", "Format Document", true, Some("Shift+Alt+F"))?,
            &MenuItem::with_id(app, "format-selection", "Format Selection", true, Some("CmdOrCtrl+Shift+Alt+F"))?,
        ],
    )?;

    // View menu
    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &MenuItem::with_id(app, "toggle-sidebar", "Toggle Sidebar", true, Some("CmdOrCtrl+B"))?,
            &MenuItem::with_id(app, "toggle-right-panel", "Toggle Right Panel", true, Some("CmdOrCtrl+Alt+B"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "show-outline", "Show Outline", true, Some("CmdOrCtrl+Shift+O"))?,
            &MenuItem::with_id(app, "show-files", "Show Open Files", true, Some("CmdOrCtrl+Shift+E"))?,
            &MenuItem::with_id(app, "show-git", "Show Git", true, Some("CmdOrCtrl+Shift+G"))?,
            &MenuItem::with_id(app, "show-info", "Show File Info", true, Some("CmdOrCtrl+Shift+I"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "toggle-terminal", "Toggle Terminal", true, Some("CmdOrCtrl+`"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "zen-mode", "Zen Mode", true, Some("F11"))?,
        ],
    )?;

    // Window menu (macOS standard)
    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &MenuItem::with_id(app, "window-minimize", "Minimize", true, Some("CmdOrCtrl+M"))?,
            &MenuItem::with_id(app, "window-zoom", "Zoom", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "window-fullscreen", "Enter Full Screen", true, Some("Ctrl+Cmd+F"))?,
        ],
    )?;

    let menu = Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu])?;
    Ok(menu)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            write_log("setup: start");
            let menu = build_menu(app.handle())?;
            app.set_menu(menu)?;
            // NOTE: Tauri v2.10.3 macOS has a known bug where on_menu_event
            // does not fire for custom menu items. Menu items serve as visual
            // reference for keyboard shortcuts, which are handled in React via
            // window.addEventListener('keydown', ...).
            // See: https://github.com/tauri-apps/tauri/issues/11830
            app.on_menu_event(move |app, event| {
                let id: String = event.id().0.clone();
                write_log(&format!("menu-event (if firing): {}", id));
                let _ = app.emit("menu-event", id);
            });
            write_log("setup: done");
            Ok(())
        })
        .manage(ssh_commands::SshState::default())
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
            file_commands::save_file_dialog,
            file_commands::js_log,
            // Git commands
            git_commands::git_status,
            git_commands::git_diff,
            git_commands::git_diff_staged_raw,
            git_commands::git_diff_unstaged_raw,
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
            settings_commands::save_session,
            settings_commands::load_session,
            // Terminal commands
            terminal_commands::run_command,
            // AI commands
            ai_commands::ai_chat,
            ai_commands::ai_chat_stream,
            ai_commands::ai_edit,
            ai_commands::ai_ghost_text,
            ai_commands::load_ai_config,
            ai_commands::save_ai_config,
            // SSH commands
            ssh_commands::ssh_connect,
            ssh_commands::ssh_disconnect,
            ssh_commands::ssh_list_directory,
            ssh_commands::ssh_read_file,
            ssh_commands::ssh_write_file,
            ssh_commands::load_ssh_connections,
            ssh_commands::save_ssh_connections,
            ssh_commands::ssh_open_tunnel,
            ssh_commands::ssh_close_tunnel,
            ssh_commands::ssh_list_tunnels,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
