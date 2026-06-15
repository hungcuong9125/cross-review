#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod export;
mod models;
mod slug;
mod validation;
mod zip_export;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::validate_project_cmd,
            commands::generate_preview_cmd,
            commands::export_all_markdown,
            commands::export_all_zip,
            commands::save_project,
            commands::open_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
