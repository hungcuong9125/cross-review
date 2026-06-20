#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Modules are re-declared here for the binary crate; lib.rs also declares them for the library crate.
mod ai;
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
            commands::export_single_markdown,
            commands::export_multiple_zip,
            commands::save_project,
            commands::open_project,
            commands::ai_test_provider,
            commands::ai_test_provider_debug,
            commands::ai_rewrite_export,
            commands::ai_list_models,
            commands::ai_cancel_request,
            commands::ai_default_prompt,
            commands::export_settings_cmd,
            commands::import_settings_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
